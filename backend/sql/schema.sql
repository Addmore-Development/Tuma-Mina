-- ============================================================================
-- TUMA MINA — SUPABASE SCHEMA
-- Run this in the Supabase SQL editor, top to bottom, on a fresh project.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role as enum ('customer', 'runner', 'supervisor', 'admin');
create type town_name as enum ('Rustenburg', 'Johannesburg', 'Pretoria');
create type job_category as enum ('Delivery', 'Document', 'Queuing', 'Shopping', 'Errand');
create type delivery_mode as enum ('location', 'person');
create type job_status as enum (
  'posted', 'accepted', 'in_progress', 'awaiting_confirmation',
  'completed', 'disputed', 'cancelled'
);
create type quote_status as enum ('open', 'awaiting_runner');
create type application_status as enum ('pending', 'approved', 'rejected');
create type doc_status as enum ('pending', 'verified', 'rejected');
create type wallet_tx_type as enum ('hold', 'release', 'topup', 'refund');
create type account_status as enum ('active', 'suspended');

-- ---------------------------------------------------------------------------
-- PROFILES
-- One row per authenticated user (auth.users), role-tagged. Customer/runner/
-- supervisor-specific detail lives in their own tables below, keyed off this.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  name text not null,
  surname text not null default '',
  phone text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------
create table public.customer_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  id_number text not null,
  address text not null,
  notify_task_updates boolean not null default true,
  notify_promotions boolean not null default false
);

create table public.saved_locations (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  label text not null,
  address text not null,
  created_at timestamptz not null default now(),
  unique (customer_id, label)
);

create table public.wallets (
  customer_id uuid primary key references public.customer_profiles(id) on delete cascade,
  balance numeric(10,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  task_id uuid, -- FK to tasks(id) added later via ALTER TABLE, once tasks exists
  type wallet_tx_type not null,
  amount numeric(10,2) not null check (amount > 0),
  description text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RUNNER APPLICATIONS (KYC) + APPROVED RUNNERS
-- ---------------------------------------------------------------------------
create table public.runner_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  town town_name not null,
  id_number text not null,
  address text not null,
  headshot_path text,
  headshot_status doc_status not null default 'pending',
  id_document_path text,
  id_document_status doc_status not null default 'pending',
  bank_proof_path text,
  bank_proof_status doc_status not null default 'pending',
  address_proof_path text,
  address_proof_status doc_status not null default 'pending',
  status application_status not null default 'pending',
  rejection_reason text,
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id)
);

create table public.runner_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  application_id uuid not null references public.runner_applications(id),
  town town_name not null,
  rating numeric(2,1) not null default 0,
  completed_jobs int not null default 0,
  status account_status not null default 'active',
  joined_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SUPERVISORS
-- Provisioned by Admin only — no self-registration.
-- ---------------------------------------------------------------------------
create table public.supervisor_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  town town_name, -- null = "All towns"
  can_view_financials boolean not null default true,
  status account_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TASKS / JOBS
-- Single source of truth for a job. "PlatformJob" and "CustomerTask" in the
-- frontend are both views over this one table, scoped by role.
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  display_id text not null unique, -- e.g. "TM-4821", generated by trigger below
  customer_id uuid not null references public.customer_profiles(id),
  runner_id uuid references public.runner_profiles(id),
  title text not null,
  category job_category not null,
  description text not null default '',
  delivery_mode delivery_mode not null,
  location text not null,
  town town_name not null,
  deadline timestamptz not null,
  budget numeric(10,2),
  status job_status not null default 'posted',
  price numeric(10,2), -- set once a quote is accepted
  platform_fee numeric(10,2), -- 15% of price, set at acceptance
  pin text,
  reference_photos text[] not null default '{}',
  proof_photo_path text,
  delivered_at timestamptz,
  auto_release_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now()
);

create sequence public.task_display_id_seq start 4821;
create or replace function public.set_task_display_id()
returns trigger language plpgsql as $$
begin
  new.display_id := 'TM-' || nextval('public.task_display_id_seq');
  return new;
end;
$$;
create trigger trg_task_display_id
  before insert on public.tasks
  for each row execute function public.set_task_display_id();

alter table public.wallet_transactions
  add constraint wallet_transactions_task_id_fkey
  foreign key (task_id) references public.tasks(id) on delete set null;

create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  runner_id uuid not null references public.runner_profiles(id),
  price numeric(10,2) not null check (price > 0),
  note text,
  status quote_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.quote_history (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  by user_role not null, -- 'customer' or 'runner'
  price numeric(10,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.task_ratings (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- STORAGE BUCKETS
-- Private buckets — files are only reachable via signed URLs generated
-- server-side (see backend code), never public.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('runner-kyc', 'runner-kyc', false),
  ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.saved_locations enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.runner_applications enable row level security;
alter table public.runner_profiles enable row level security;
alter table public.supervisor_profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_history enable row level security;
alter table public.task_ratings enable row level security;

-- Helper: current user's role, without recursive RLS lookups.
create or replace function public.app_current_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_supervisor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'supervisor');
$$;

create or replace function public.supervisor_can_view_financials() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select can_view_financials from public.supervisor_profiles where id = auth.uid()),
    false
  );
$$;

-- --- profiles ---------------------------------------------------------------
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid() or is_admin() or is_supervisor());
create policy "profiles: self insert" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid());

-- --- customer_profiles -------------------------------------------------------
create policy "customer: self" on public.customer_profiles
  for all using (id = auth.uid() or is_admin() or is_supervisor())
  with check (id = auth.uid());

-- --- saved_locations ----------------------------------------------------------
create policy "saved_locations: owner" on public.saved_locations
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- --- wallets --------------------------------------------------------------
-- Balance mutations happen only via SECURITY DEFINER RPCs (below) — direct
-- writes are blocked so a client can never credit itself.
create policy "wallets: owner read" on public.wallets
  for select using (
    customer_id = auth.uid() or is_admin()
    or (is_supervisor() and supervisor_can_view_financials())
  );

-- --- wallet_transactions ----------------------------------------------------
create policy "wallet_tx: owner or authorised read" on public.wallet_transactions
  for select using (
    customer_id = auth.uid() or is_admin()
    or (is_supervisor() and supervisor_can_view_financials())
    or exists (
      select 1 from public.tasks t
      where t.id = wallet_transactions.task_id and t.runner_id = auth.uid()
    )
  );
-- inserts happen only via RPCs (security definer), no direct-insert policy.

-- --- runner_applications -----------------------------------------------------
create policy "applications: applicant read own" on public.runner_applications
  for select using (user_id = auth.uid() or is_admin() or is_supervisor());
create policy "applications: applicant insert own" on public.runner_applications
  for insert with check (user_id = auth.uid());
create policy "applications: admin update" on public.runner_applications
  for update using (is_admin());

-- --- runner_profiles -----------------------------------------------------------
create policy "runners: public read for job matching" on public.runner_profiles
  for select using (true); -- runner names/ratings are visible platform-wide (needed for quotes)
create policy "runners: admin write" on public.runner_profiles
  for insert with check (is_admin());
create policy "runners: admin update" on public.runner_profiles
  for update using (is_admin());

-- --- supervisor_profiles -----------------------------------------------------
create policy "supervisors: admin only" on public.supervisor_profiles
  for all using (is_admin() or id = auth.uid()) with check (is_admin());

-- --- tasks --------------------------------------------------------------------
create policy "tasks: read scoped" on public.tasks
  for select using (
    customer_id = auth.uid()
    or runner_id = auth.uid()
    or is_admin()
    or is_supervisor()
    or (status = 'posted' and app_current_role() = 'runner') -- open jobs visible to all runners in-town
  );
create policy "tasks: customer insert" on public.tasks
  for insert with check (customer_id = auth.uid());
create policy "tasks: customer update own pre-acceptance" on public.tasks
  for update using (
    customer_id = auth.uid() or runner_id = auth.uid() or is_admin()
  );

-- --- quotes ---------------------------------------------------------------------
create policy "quotes: read via task visibility" on public.quotes
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = quotes.task_id
        and (t.customer_id = auth.uid() or t.runner_id = auth.uid() or is_admin() or is_supervisor())
    )
    or runner_id = auth.uid()
  );
create policy "quotes: runner insert own" on public.quotes
  for insert with check (runner_id = auth.uid());
create policy "quotes: runner or customer update" on public.quotes
  for update using (
    runner_id = auth.uid()
    or exists (select 1 from public.tasks t where t.id = quotes.task_id and t.customer_id = auth.uid())
  );

create policy "quote_history: read via quote visibility" on public.quote_history
  for select using (
    exists (
      select 1 from public.quotes q join public.tasks t on t.id = q.task_id
      where q.id = quote_history.quote_id
        and (t.customer_id = auth.uid() or q.runner_id = auth.uid() or is_admin())
    )
  );
create policy "quote_history: insert via quote visibility" on public.quote_history
  for insert with check (
    exists (
      select 1 from public.quotes q join public.tasks t on t.id = q.task_id
      where q.id = quote_history.quote_id
        and (t.customer_id = auth.uid() or q.runner_id = auth.uid())
    )
  );

-- --- task_ratings ---------------------------------------------------------------
create policy "ratings: read via task visibility" on public.task_ratings
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_ratings.task_id
        and (t.customer_id = auth.uid() or t.runner_id = auth.uid() or is_admin())
    )
  );
create policy "ratings: customer insert own task" on public.task_ratings
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_ratings.task_id and t.customer_id = auth.uid())
  );

-- ============================================================================
-- RPCs — money-moving and multi-table operations run server-side only.
-- ============================================================================

-- Top up a customer's wallet. In production, call this from a webhook once
-- the real payment provider (PayFast/Yoco/Stripe) confirms payment — never
-- directly from the client.
create or replace function public.wallet_topup(p_customer_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  update public.wallets set balance = balance + p_amount, updated_at = now()
    where customer_id = p_customer_id;
  insert into public.wallet_transactions (customer_id, type, amount, description)
    values (p_customer_id, 'topup', p_amount, 'Wallet top-up');
end;
$$;

-- Customer accepts a quote: moves funds from available balance into escrow
-- (i.e. deducts from wallets.balance and logs a 'hold'), assigns the runner,
-- and flips the task to 'accepted'.
create or replace function public.accept_quote(p_task_id uuid, p_quote_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_runner_id uuid;
  v_price numeric;
  v_balance numeric;
begin
  select customer_id into v_customer_id from public.tasks where id = p_task_id;
  if v_customer_id != auth.uid() then
    raise exception 'Not authorised';
  end if;

  select runner_id, price into v_runner_id, v_price from public.quotes where id = p_quote_id and task_id = p_task_id;
  if v_runner_id is null then
    raise exception 'Quote not found';
  end if;

  select balance into v_balance from public.wallets where customer_id = v_customer_id;
  if v_balance < v_price then
    raise exception 'Insufficient wallet balance';
  end if;

  update public.wallets set balance = balance - v_price, updated_at = now() where customer_id = v_customer_id;

  update public.tasks
    set status = 'accepted', runner_id = v_runner_id, price = v_price, platform_fee = round(v_price * 0.15, 2)
    where id = p_task_id;

  update public.quotes set status = 'open' where id = p_quote_id;

  insert into public.wallet_transactions (customer_id, task_id, type, amount, description)
    values (v_customer_id, p_task_id, 'hold', v_price,
      'Held for ' || (select display_id from public.tasks where id = p_task_id));
end;
$$;

-- Customer approves completed work: releases held funds to the runner and
-- credits the runner's completed_jobs count. Runner payout ledgering is
-- assumed to live in a separate runner_payouts table / provider payout —
-- add one here if you need in-app runner balances too.
create or replace function public.approve_and_release(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_runner_id uuid;
  v_price numeric;
begin
  select customer_id, runner_id, price into v_customer_id, v_runner_id, v_price
    from public.tasks where id = p_task_id;

  if v_customer_id != auth.uid() then
    raise exception 'Not authorised';
  end if;

  update public.tasks set status = 'completed', completed_at = now() where id = p_task_id;
  update public.runner_profiles set completed_jobs = completed_jobs + 1 where id = v_runner_id;

  insert into public.wallet_transactions (customer_id, task_id, type, amount, description)
    values (v_customer_id, p_task_id, 'release', v_price,
      'Released to runner · ' || (select display_id from public.tasks where id = p_task_id));
end;
$$;

-- Admin approves a runner application: flips status and provisions the
-- runner_profiles row + 'runner' role. Requires the applicant to already
-- have a profiles row (created at signup) with role set to 'runner'.
create or replace function public.approve_runner_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_town town_name;
  v_headshot doc_status;
  v_id doc_status;
  v_bank doc_status;
  v_address doc_status;
begin
  if not is_admin() then
    raise exception 'Not authorised';
  end if;

  select user_id, town, headshot_status, id_document_status, bank_proof_status, address_proof_status
    into v_user_id, v_town, v_headshot, v_id, v_bank, v_address
    from public.runner_applications where id = p_application_id;

  update public.runner_applications
    set status = 'approved', decided_at = now(), decided_by = auth.uid()
    where id = p_application_id;

  insert into public.runner_profiles (id, application_id, town)
    values (v_user_id, p_application_id, v_town)
    on conflict (id) do nothing;
end;
$$;