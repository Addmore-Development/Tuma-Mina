-- ============================================================================
-- TUMA MINA — Fix: customers not appearing on admin dashboard
-- Run this ENTIRE file in one go, top to bottom, in Supabase SQL Editor.
-- Safe to re-run any time (every statement is idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Install the signup trigger.
--    Customers get a self-signup with instant access (no approval needed) —
--    this trigger provisions their profiles/customer_profiles/wallets row
--    as part of the signup transaction. Runners still require admin
--    approval via runner_applications, handled separately.
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

-- ---------------------------------------------------------------------------
-- 2. Backfill anyone who signed up before the trigger existed.
-- ---------------------------------------------------------------------------
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

insert into public.customer_profiles (id, id_number, address)
select p.id, '', ''
from public.profiles p
left join public.customer_profiles cp on cp.id = p.id
where p.role = 'customer' and cp.id is null
on conflict (id) do nothing;

insert into public.wallets (customer_id, balance)
select p.id, 0
from public.profiles p
left join public.wallets w on w.customer_id = p.id
where p.role = 'customer' and w.customer_id is null
on conflict (customer_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Make sure every table the dashboards subscribe to for live updates is
--    actually in the realtime publication (it was empty before).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'tasks', 'quotes', 'quote_history', 'runner_applications',
    'runner_profiles', 'customer_profiles', 'supervisor_profiles',
    'wallet_transactions', 'wallets'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Verify. You should see: the trigger listed, auth_users = profiles =
--    (customer count in profiles) for customer_profiles, and 0 orphans.
-- ---------------------------------------------------------------------------
select tgname from pg_trigger where tgname = 'on_auth_user_created';

select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.profiles where role = 'customer') as customer_role_profiles,
  (select count(*) from public.customer_profiles) as customer_profiles,
  (select count(*) from public.wallets) as wallets;

select u.id, u.email, u.raw_user_meta_data->>'role' as role
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;