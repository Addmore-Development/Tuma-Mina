import { supabase } from "./supabaseClient";
import type { TownName } from "./types";

// ---------------------------------------------------------------------------
// Runner applications (KYC review)
// ---------------------------------------------------------------------------

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("runner-kyc").createSignedUrl(path, 60 * 10); // 10 min
  if (error) return null;
  return data.signedUrl;
}

export async function fetchPendingApplications() {
  const { data, error } = await supabase
    .from("runner_applications")
    .select("*, profiles!user_id(name, surname, phone, email)")
    .eq("status", "pending")
    .order("applied_at", { ascending: true });
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (a: any) => ({
      ...a,
      headshot_url: await signedUrl(a.headshot_path),
      id_document_url: await signedUrl(a.id_document_path),
      bank_proof_url: await signedUrl(a.bank_proof_path),
      address_proof_url: await signedUrl(a.address_proof_path),
    }))
  );
}

export function isApplicationComplete(a: {
  id_number: string; address: string;
  headshot_path: string | null; id_document_path: string | null;
  bank_proof_path: string | null; address_proof_path: string | null;
}): boolean {
  return Boolean(a.id_number?.trim() && a.address?.trim() && a.headshot_path && a.id_document_path && a.bank_proof_path && a.address_proof_path);
}

export async function approveApplication(applicationId: string) {
  const { error } = await supabase.rpc("approve_runner_application", { p_application_id: applicationId });
  if (error) throw error;
}

export async function rejectApplication(applicationId: string, reason: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const adminId = sessionData.session?.user.id;
  const { error } = await supabase
    .from("runner_applications")
    .update({ status: "rejected", rejection_reason: reason, decided_at: new Date().toISOString(), decided_by: adminId })
    .eq("id", applicationId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Runners
// ---------------------------------------------------------------------------

export async function fetchAllRunners() {
  const { data, error } = await supabase
    .from("runner_profiles")
    .select("*, profiles(name, surname, phone, email)")
    .order("joined_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleRunnerStatus(runnerId: string, currentStatus: "active" | "suspended") {
  const { error } = await supabase
    .from("runner_profiles")
    .update({ status: currentStatus === "active" ? "suspended" : "active" })
    .eq("id", runnerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Customers — admins need visibility over every signup, not just runners.
// ---------------------------------------------------------------------------

export async function fetchAllCustomers() {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("id, id_number, address, notify_task_updates, notify_promotions, profiles(name, surname, phone, email, created_at), wallets(balance)")
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Supervisors
// ---------------------------------------------------------------------------

export async function addSupervisor(input: {
  name: string; surname: string; email: string; town: TownName | "All towns"; canViewFinancials: boolean;
}) {
  const { data, error } = await supabase.functions.invoke("invite-supervisor", {
    body: {
      name: input.name,
      surname: input.surname,
      email: input.email,
      town: input.town === "All towns" ? null : input.town,
      canViewFinancials: input.canViewFinancials,
    },
  });
  if (error) {
    // supabase-js only gives a generic "non-2xx status code" message for
    // Edge Function errors — the actual reason is in the response body.
    let detail: string | undefined;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) detail = (await ctx.clone().json())?.error;
    } catch {
      // response body wasn't JSON — fall back to the generic error below
    }
    throw new Error(detail || error.message);
  }
  return data as { ok: true; userId: string; email: string; temporaryPassword: string };
}

export async function fetchAllSupervisors() {
  const { data, error } = await supabase
    .from("supervisor_profiles")
    .select("*, profiles!supervisor_profiles_id_fkey(name, surname, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleSupervisorStatus(supervisorId: string, currentStatus: "active" | "suspended") {
  const { error } = await supabase
    .from("supervisor_profiles")
    .update({ status: currentStatus === "active" ? "suspended" : "active" })
    .eq("id", supervisorId);
  if (error) throw error;
}

export async function toggleSupervisorFinance(supervisorId: string, current: boolean) {
  const { error } = await supabase
    .from("supervisor_profiles")
    .update({ can_view_financials: !current })
    .eq("id", supervisorId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Jobs (all towns) + finance
// ---------------------------------------------------------------------------

export async function fetchAllJobs(town?: TownName) {
  let query = supabase
    .from("tasks")
    .select("*, customer_profiles(profiles(name, surname)), runner_profiles(profiles(name, surname))")
    .order("created_at", { ascending: false });
  if (town) query = query.eq("town", town);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchFinanceSummary() {
  const { data, error } = await supabase.from("tasks").select("price, platform_fee, status").eq("status", "completed");
  if (error) throw error;
  const totalHandled = (data ?? []).reduce((s, j) => s + Number(j.price ?? 0), 0);
  const revenue = (data ?? []).reduce((s, j) => s + Number(j.platform_fee ?? 0), 0);
  return { totalHandled, revenue, completedCount: (data ?? []).length };
}

export async function resolveDispute(taskId: string, refundToCustomer: boolean) {
  const { error } = await supabase.rpc("resolve_dispute", { p_task_id: taskId, p_refund: refundToCustomer });
  if (error) throw error;
}