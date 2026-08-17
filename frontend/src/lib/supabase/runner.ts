import { supabase } from "./supabaseClient";

/** The logged-in runner's application/profile — used to gate the dashboard
 * into pending/rejected/approved states, same as RunnerDashboard.tsx expects. */
export async function fetchMyApplication() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("runner_applications")
    .select("*, profiles(name, surname, phone, email)")
    .eq("user_id", userId)
    .order("applied_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

/** Jobs posted (status = 'posted') in the runner's own town — RLS already
 * restricts this to runners, this just adds the town filter. */
export async function fetchAvailableJobs(town: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, customer_profiles(profiles(name))")
    .eq("status", "posted")
    .eq("town", town)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMyJobs() {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("tasks")
    .select("*, customer_profiles(profiles(name))")
    .eq("runner_id", runnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Runner submits an initial quote on an open task (or accepts the budget
 * outright by quoting the budget amount). */
export async function submitQuote(taskId: string, price: number, note?: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  const { error } = await supabase.from("quotes").insert({ task_id: taskId, runner_id: runnerId, price, note });
  if (error) throw error;
}

/** Runner responds to a customer's counter-offer. */
export async function respondToCounter(quoteId: string, accept: boolean, counterPrice: number, resolvedPrice: number) {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  const { error } = await supabase
    .from("quotes")
    .update({ price: resolvedPrice, status: "open" })
    .eq("id", quoteId);
  if (error) throw error;

  const { error: histError } = await supabase.from("quote_history").insert({
    quote_id: quoteId,
    by: "runner",
    price: resolvedPrice,
    note: accept ? "Accepted your offer" : "Countered back",
  });
  if (histError) throw histError;
}

export async function markInProgress(taskId: string) {
  const { error } = await supabase.from("tasks").update({ status: "in_progress" }).eq("id", taskId);
  if (error) throw error;
}

export async function markDelivered(taskId: string, proofPhoto?: File) {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  let proofPath: string | undefined;
  if (proofPhoto) {
    const path = `${runnerId}/${taskId}-proof-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("task-photos").upload(path, proofPhoto);
    if (error) throw error;
    proofPath = path;
  }

  const AUTO_RELEASE_HOURS = 72;
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "awaiting_confirmation",
      delivered_at: new Date().toISOString(),
      auto_release_at: new Date(Date.now() + AUTO_RELEASE_HOURS * 3_600_000).toISOString(),
      proof_photo_path: proofPath,
    })
    .eq("id", taskId);
  if (error) throw error;
}

/** Runner enters the hand-off PIN given by the receiver, confirming a
 * "person" delivery mode task — same effect as markDelivered but PIN-based. */
export async function confirmPinHandoff(taskId: string, enteredPin: string) {
  const { data: task, error: fetchErr } = await supabase.from("tasks").select("pin").eq("id", taskId).single();
  if (fetchErr) throw fetchErr;
  if (task.pin !== enteredPin) throw new Error("Incorrect PIN");

  const AUTO_RELEASE_HOURS = 72;
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "awaiting_confirmation",
      delivered_at: new Date().toISOString(),
      auto_release_at: new Date(Date.now() + AUTO_RELEASE_HOURS * 3_600_000).toISOString(),
    })
    .eq("id", taskId);
  if (error) throw error;
}

export async function fetchEarnings() {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("tasks")
    .select("price, platform_fee")
    .eq("runner_id", runnerId)
    .eq("status", "completed");
  if (error) throw error;

  const total = (data ?? []).reduce((sum, j) => sum + (Number(j.price ?? 0) - Number(j.platform_fee ?? 0)), 0);
  return { total, jobCount: (data ?? []).length };
}