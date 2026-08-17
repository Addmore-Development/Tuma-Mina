-- Adds the dispute-resolution RPC referenced by
-- backend/admin.ts `resolveDispute()`.

create or replace function public.resolve_dispute(p_task_id uuid, p_refund boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_runner_id uuid;
  v_price numeric;
  v_display_id text;
begin
  if not is_admin() then
    raise exception 'Not authorised';
  end if;

  select customer_id, runner_id, price, display_id
    into v_customer_id, v_runner_id, v_price, v_display_id
    from public.tasks where id = p_task_id;

  if p_refund then
    update public.wallets set balance = balance + v_price, updated_at = now() where customer_id = v_customer_id;
    update public.tasks set status = 'cancelled', cancel_reason = 'Refunded after dispute review' where id = p_task_id;
    insert into public.wallet_transactions (customer_id, task_id, type, amount, description)
      values (v_customer_id, p_task_id, 'refund', v_price, 'Refunded after dispute · ' || v_display_id);
  else
    update public.tasks set status = 'completed', completed_at = now() where id = p_task_id;
    update public.runner_profiles set completed_jobs = completed_jobs + 1 where id = v_runner_id;
    insert into public.wallet_transactions (customer_id, task_id, type, amount, description)
      values (v_customer_id, p_task_id, 'release', v_price, 'Released after dispute review · ' || v_display_id);
  end if;
end;
$$;