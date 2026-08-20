import { supabase } from "./supabaseClient";

export async function fetchMySupervisorProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("supervisor_profiles")
    .select("*, profiles!supervisor_profiles_id_fkey(name, surname, email)")
    .eq("id", userId)
    .single();
  if (error) throw error;

  // Normalize into the flat shape the dashboard expects — the raw row has
  // the person's name nested under `profiles` and the financials flag in
  // snake_case, neither of which match `currentSupervisor.name` /
  // `.canViewFinancials` as used in supervisorDashboard.tsx.
  const fullName = [data.profiles?.name, data.profiles?.surname].filter(Boolean).join(" ") || "Supervisor";
  return {
    name: fullName,
    town: (data.town ?? "All towns") as string,
    canViewFinancials: !!data.can_view_financials,
  };
}

export async function fetchScopedJobs(town: string | null) {
  let query = supabase
    .from("tasks")
    .select("*, customer_profiles(profiles(name)), runner_profiles(profiles(name))")
    .order("created_at", { ascending: false });
  if (town) query = query.eq("town", town);
  const { data, error } = await query;
  if (error) throw error;

  // Same normalization as fetchMySupervisorProfile / fetchScopedRunners
  // above — raw rows nest names under joined tables, but
  // supervisorDashboard.tsx renders these flat (j.id as the display id,
  // j.customerName, j.runnerName, j.price).
  return (data ?? []).map((j: any) => ({
    id: j.display_id ?? j.id,
    title: j.title,
    customerName: j.customer_profiles?.profiles?.name ?? "Customer",
    runnerName: j.runner_profiles?.profiles?.name ?? undefined,
    status: j.status,
    price: Number(j.price ?? j.budget ?? 0),
    town: j.town,
  }));
}

export async function fetchScopedRunners(town: string | null) {
  let query = supabase.from("runner_profiles").select("*, profiles(name, surname, phone, email)");
  if (town) query = query.eq("town", town);
  const { data, error } = await query;
  if (error) throw error;

  // Same normalization as fetchMySupervisorProfile above — raw rows nest
  // the person's name under `profiles` and use snake_case, but
  // supervisorDashboard.tsx renders these as a flat RunnerProfile
  // (r.name, r.rating, r.completedJobs).
  return (data ?? []).map((r: any) => ({
    id: r.id,
    applicationId: r.application_id ?? r.id,
    name: [r.profiles?.name, r.profiles?.surname].filter(Boolean).join(" ") || "Runner",
    town: r.town,
    phone: r.profiles?.phone ?? "",
    email: r.profiles?.email ?? "",
    rating: Number(r.rating ?? 0),
    completedJobs: Number(r.completed_jobs ?? 0),
    status: r.status,
    joinedAt: r.created_at ?? r.joined_at ?? "",
  }));
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