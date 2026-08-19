-- Run after schema.sql / schema_additions.sql.

alter type delivery_mode add value if not exists 'courier';

alter table public.tasks
  add column if not exists courier_provider text check (courier_provider in ('Courier Guy', 'Pexi')),
  add column if not exists tracking_number text;

-- A courier-mode task can't move to awaiting_confirmation without a tracking
-- number — enforced at the application layer (backend/runner.ts) since a
-- CHECK constraint can't easily reference status conditionally here without
-- a trigger. Add one if you want DB-level enforcement:
create or replace function public.enforce_courier_tracking()
returns trigger language plpgsql as $$
begin
  if new.delivery_mode = 'courier' and new.status = 'awaiting_confirmation' and (new.tracking_number is null or new.tracking_number = '') then
    raise exception 'A tracking number is required before marking a courier task as delivered.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_courier_tracking on public.tasks;
create trigger trg_enforce_courier_tracking
  before update on public.tasks
  for each row execute function public.enforce_courier_tracking();