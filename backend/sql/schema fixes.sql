-- ============================================================================
-- TUMA MINA — BUG FIXES
-- Run this after schema.sql / schema_additions.sql / Schemacourier.sql.
-- Safe to re-run (uses create-or-replace / drop-if-exists throughout).
--
-- Fixes:
--   1. "profiles table empty for new users" — profiles (and, for customers,
--      customer_profiles + wallets) are now provisioned server-side by a
--      trigger on auth.users, instead of relying on a client-side insert
--      that only works if the browser already has a live session. This is
--      what was actually causing "Failed to load admin data" too: accounts
--      created via backend/create-admin.ps1 (or any signup where email
--      confirmation is required) never got a profiles row, so is_admin() /
--      is_supervisor() evaluated to false and RLS correctly — but
--      confusingly — blocked every query.
--   2. Missing `runner_accept_job` RPC referenced by
--      frontend/src/lib/supabase/runner.ts and backend/runner.ts, but never
--      defined anywhere — this is why runners could never actually pick up
--      a posted job.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Auto-provision a profile (and customer sub-rows) whenever a new
--    auth.users row is created — fires regardless of whether email
--    confirmation is required, because it runs as part of the signup
--    transaction itself rather than a follow-up client request.
--
--    Expects the client to pass these via supabase.auth.signUp({ options: {
--    data: { role, name, surname, phone, id_number, address } } }) — see the
--    updated signUpCustomer/signUpRunner in frontend/src/lib/supabase/auth.ts.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer');
  v_name text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_surname text := coalesce(new.raw_user_meta_data->>'surname', '');
  v_phone text := coalesce(new.raw_user_meta_data->>'phone', '');
begin
  insert into public.profiles (id, role, name, surname, phone, email)
  values (new.id, v_role, v_name, v_surname, v_phone, new.email)
  on conflict (id) do nothing;

  -- Customers need customer_profiles + a zero-balance wallet to exist before
  -- they can do anything (post a task, see a wallet balance, etc). Runners
  -- don't get runner_profiles here — that only gets created once an admin
  -- approves their KYC application (see approve_runner_application), and
  -- supervisors are provisioned separately by the invite-supervisor edge
  -- function, not via self-signup.
  if v_role = 'customer' then
    insert into public.customer_profiles (id, id_number, address)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'id_number', ''),
      coalesce(new.raw_user_meta_data->>'address', '')
    )
    on conflict (id) do nothing;

    insert into public.wallets (customer_id, balance)
    values (new.id, 0)
    on conflict (customer_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-off backfill: if any auth.users rows already exist without a matching
-- profiles row (e.g. the admin account created via create-admin.ps1 before
-- this fix existed), create them now, defaulting to 'admin' only for users
-- whose metadata already says so — everyone else backfills as 'customer' and
-- should be corrected manually (update public.profiles set role = ... where
-- id = '...') if that's wrong for a given account.
insert into public.profiles (id, role, name, surname, phone, email)
select
  u.id,
  coalesce((u.raw_user_meta_data->>'role')::user_role, 'customer'),
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'surname', ''),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Runner accepts a "posted" job directly at its listed budget — no quote
--    negotiation needed. Mirrors accept_quote's escrow logic but works off
--    tasks.budget instead of a quotes row, and assigns the calling runner.
-- ---------------------------------------------------------------------------
create or replace function public.runner_accept_job(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_runner_id uuid := auth.uid();
  v_status job_status;
  v_price numeric;
  v_balance numeric;
begin
  if not exists (select 1 from public.runner_profiles where id = v_runner_id and status = 'active') then
    raise exception 'Not an active runner';
  end if;

  select customer_id, status, budget into v_customer_id, v_status, v_price
    from public.tasks where id = p_task_id;

  if v_customer_id is null then
    raise exception 'Task not found';
  end if;
  if v_status != 'posted' then
    raise exception 'This job has already been taken';
  end if;
  if v_price is null then
    raise exception 'This job has no fixed budget — submit a quote instead';
  end if;

  select balance into v_balance from public.wallets where customer_id = v_customer_id;
  if v_balance < v_price then
    raise exception 'Customer has insufficient wallet balance';
  end if;

  update public.wallets set balance = balance - v_price, updated_at = now() where customer_id = v_customer_id;

  update public.tasks
    set status = 'accepted', runner_id = v_runner_id, price = v_price, platform_fee = round(v_price * 0.15, 2)
    where id = p_task_id;

  insert into public.wallet_transactions (customer_id, task_id, type, amount, description)
    values (v_customer_id, p_task_id, 'hold', v_price,
      'Held for ' || (select display_id from public.tasks where id = p_task_id));
end;
$$;