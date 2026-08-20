import { supabase } from "./supabaseClient";
import type { PlatformJob, RunnerApplication } from "../../types/platform";

// ---------------------------------------------------------------------------
// Mapping helpers — DB row shape -> frontend type shape, so RunnerDashboard
// doesn't need its own ad hoc row types.
// ---------------------------------------------------------------------------

function mapJobRow(t: any): PlatformJob {
  return {
    id: t.display_id,
    title: t.title,
    category: t.category,
    description: t.description ?? "",
    town: t.town,
    location: t.location,
    deliveryMode: t.delivery_mode,
    customerName: t.customer_profiles?.profiles?.name ?? "Customer",
    status: t.status,
    // Posted jobs (no accepted price yet) show the customer's budget as the
    // headline number; once accepted, price/platform_fee are set for real.
    price: Number(t.price ?? t.budget ?? 0),
    platformFee: Number(t.platform_fee ?? (t.budget ? t.budget * 0.15 : 0)),
    postedAt: t.created_at,
    deadline: t.deadline,
    referencePhotos: t.reference_photos ?? [],
    funded: t.funded ?? false,
    proofPhotoUrl: t.proof_photo_path ?? undefined,
    courierProvider: t.courier_provider ?? undefined,
    trackingNumber: t.tracking_number ?? undefined,
    dropLat: t.drop_lat != null ? Number(t.drop_lat) : undefined,
    dropLng: t.drop_lng != null ? Number(t.drop_lng) : undefined,
    deliveredAt: t.delivered_at ?? undefined,
    autoReleaseAt: t.auto_release_at ?? undefined,
    completedAt: t.completed_at ?? undefined,
    cancelReason: t.cancel_reason ?? undefined,
  };
}

function mapApplicationRow(a: any): RunnerApplication {
  const doc = (path: string | null, status: string) =>
    path ? { fileName: path.split("/").pop() ?? path, uploadedAt: a.applied_at, status: status as "pending" | "verified" | "rejected" } : null;

  return {
    id: a.id,
    name: a.profiles?.name ?? "",
    surname: a.profiles?.surname ?? "",
    phone: a.profiles?.phone ?? "",
    email: a.profiles?.email ?? "",
    town: a.town,
    idNumber: a.id_number,
    address: a.address,
    headshot: doc(a.headshot_path, a.headshot_status),
    idDocument: doc(a.id_document_path, a.id_document_status),
    bankProof: doc(a.bank_proof_path, a.bank_proof_status),
    addressProof: doc(a.address_proof_path, a.address_proof_status),
    appliedAt: a.applied_at,
    status: a.status,
    rejectionReason: a.rejection_reason ?? undefined,
  };
}

export async function fetchMyApplication(): Promise<RunnerApplication> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("runner_applications")
    .select("*, profiles!user_id(name, surname, phone, email)")
    .eq("user_id", userId)
    .order("applied_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return mapApplicationRow(data);
}

export async function fetchAvailableJobs(town: string): Promise<PlatformJob[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, customer_profiles(profiles(name))")
    .eq("status", "posted")
    .eq("town", town)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapJobRow);
}

export async function fetchMyJobs(): Promise<PlatformJob[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("tasks")
    .select("*, customer_profiles(profiles(name))")
    .eq("runner_id", runnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapJobRow);
}

/**
 * Runner accepts a "posted" job directly at its listed budget (no quote
 * negotiation needed). Moves the price into escrow immediately via the
 * runner_accept_job RPC — see backend/schema_runner_accept.sql.
 */
/** `taskDisplayId` is the human-readable id (e.g. "TM-4821") shown in the UI. */
export async function acceptAvailableJob(taskDisplayId: string) {
  const { data: task, error: taskErr } = await supabase.from("tasks").select("id").eq("display_id", taskDisplayId).single();
  if (taskErr) throw taskErr;
  const { error } = await supabase.rpc("runner_accept_job", { p_task_id: task.id });
  if (error) throw error; // surfaces "This job has already been taken" etc. to the UI
}

export async function submitQuote(taskId: string, price: number, note?: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  const { error } = await supabase.from("quotes").insert({ task_id: taskId, runner_id: runnerId, price, note });
  if (error) throw error;
}

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

const AUTO_RELEASE_HOURS = 72;

export async function markInProgress(taskDisplayId: string) {
  const { error } = await supabase.from("tasks").update({ status: "in_progress" }).eq("display_id", taskDisplayId);
  if (error) throw error; // RLS restricts this to the assigned runner (runner_id = auth.uid())
}

/** Runner backs out of a job they've accepted — reopens it for other runners and refunds escrow if funded. */
export async function cancelAcceptedJob(taskDisplayId: string) {
  const { data: task, error: taskErr } = await supabase.from("tasks").select("id").eq("display_id", taskDisplayId).single();
  if (taskErr) throw taskErr;
  const { error } = await supabase.rpc("runner_cancel_job", { p_task_id: task.id });
  if (error) throw error;
}

/** Proof for delivery_mode "location" — a photo plus the runner's device location at drop-off. */
export async function markDelivered(taskDisplayId: string, proofPhoto?: File, coords?: { lat: number; lng: number }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const runnerId = sessionData.session?.user.id;
  if (!runnerId) throw new Error("Not logged in");

  let proofPath: string | undefined;
  if (proofPhoto) {
    const path = `${runnerId}/${taskDisplayId}-proof-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("task-photos").upload(path, proofPhoto);
    if (error) throw error;
    proofPath = path;
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "awaiting_confirmation",
      delivered_at: new Date().toISOString(),
      auto_release_at: new Date(Date.now() + AUTO_RELEASE_HOURS * 3_600_000).toISOString(),
      proof_photo_path: proofPath,
      drop_lat: coords?.lat ?? null,
      drop_lng: coords?.lng ?? null,
    })
    .eq("display_id", taskDisplayId);
  if (error) throw error;
}

/** Proof for delivery_mode "person" — the receiver's PIN, entered by the runner on hand-off. */
export async function confirmPinHandoff(taskDisplayId: string, enteredPin: string) {
  const { data: task, error: fetchErr } = await supabase.from("tasks").select("pin").eq("display_id", taskDisplayId).single();
  if (fetchErr) throw fetchErr;
  if (task.pin !== enteredPin) throw new Error("Incorrect PIN");

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "awaiting_confirmation",
      delivered_at: new Date().toISOString(),
      auto_release_at: new Date(Date.now() + AUTO_RELEASE_HOURS * 3_600_000).toISOString(),
    })
    .eq("display_id", taskDisplayId);
  if (error) throw error;
}

/** Proof for delivery_mode "courier" (e.g. Paxi) — provider + tracking number. */
export async function submitCourierProof(taskDisplayId: string, courierProvider: string, trackingNumber: string) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "awaiting_confirmation",
      delivered_at: new Date().toISOString(),
      auto_release_at: new Date(Date.now() + AUTO_RELEASE_HOURS * 3_600_000).toISOString(),
      courier_provider: courierProvider,
      tracking_number: trackingNumber,
    })
    .eq("display_id", taskDisplayId);
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