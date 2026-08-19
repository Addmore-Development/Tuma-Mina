import { supabase } from "./supabaseClient";

export async function fetchMySupervisorProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("supervisor_profiles")
    .select("*, profiles(name, surname, email)")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data; // includes can_view_financials — gate the Money tab on this
}

export async function fetchScopedJobs(town: string | null) {
  let query = supabase
    .from("tasks")
    .select("*, customer_profiles(profiles(name)), runner_profiles(profiles(name))")
    .order("created_at", { ascending: false });
  if (town) query = query.eq("town", town);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchScopedRunners(town: string | null) {
  let query = supabase.from("runner_profiles").select("*, profiles(name, surname, phone, email)");
  if (town) query = query.eq("town", town);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * customer_profiles has no `town` column (customers aren't town-scoped —
 * only their tasks are), so unlike jobs/runners this always returns every
 * customer regardless of the supervisor's town. RLS ("customer: self" in
 * schema.sql) already permits is_supervisor() to read every row here.
 */
export async function fetchScopedCustomers() {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("id, profiles(name, surname, phone, email, created_at), wallets(balance)")
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Only call this if fetchMySupervisorProfile().can_view_financials is true —
 * RLS will also silently return zero rows otherwise (see the
 * "wallet_tx: owner or authorised read" policy in schema.sql), but check
 * client-side too so the UI doesn't render an empty-looking financial page.
 */
export async function fetchMoneyMovement() {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*, tasks(display_id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}