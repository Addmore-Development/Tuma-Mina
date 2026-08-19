import { supabase } from "./supabaseClient";
import type { CustomerTask, Quote, WalletTransaction } from "../../types/types";
import type { DbTask, DbQuote } from "./types";

// ---------------------------------------------------------------------------
// Mapping helpers — DB row shape -> frontend type shape, so components don't
// need to change at all.
// ---------------------------------------------------------------------------

function mapQuote(q: DbQuote, runnerName: string, runnerRating: number): Quote {
  return {
    id: q.id,
    runnerName,
    runnerRating,
    price: Number(q.price),
    note: q.note ?? undefined,
    status: q.status,
  };
}

async function mapTask(t: DbTask): Promise<CustomerTask> {
  const { data: quoteRows } = await supabase
    .from("quotes")
    .select("*, runner_profiles(id, rating, profiles(name, surname))")
    .eq("task_id", t.id);

  const quotes: Quote[] = (quoteRows ?? []).map((q: any) =>
    mapQuote(q, `${q.runner_profiles?.profiles?.name ?? "Runner"} ${q.runner_profiles?.profiles?.surname?.[0] ?? ""}.`, Number(q.runner_profiles?.rating ?? 0))
  );

  let acceptedQuote: Quote | undefined;
  if (t.runner_id && t.status !== "posted") {
    const { data: runnerProfile } = await supabase
      .from("runner_profiles")
      .select("rating, profiles(name, surname)")
      .eq("id", t.runner_id)
      .single();
    acceptedQuote = {
      id: `${t.id}-accepted`,
      runnerName: `${(runnerProfile as any)?.profiles?.name ?? "Runner"} ${(runnerProfile as any)?.profiles?.surname?.[0] ?? ""}.`,
      runnerRating: Number((runnerProfile as any)?.rating ?? 0),
      price: Number(t.price ?? 0),
      status: "open",
    };
  }

  let rating: CustomerTask["rating"];
  const { data: ratingRow } = await supabase.from("task_ratings").select("*").eq("task_id", t.id).maybeSingle();
  if (ratingRow) rating = { stars: ratingRow.stars, comment: ratingRow.comment };

  return {
    id: t.display_id,
    title: t.title,
    category: t.category,
    description: t.description,
    deliveryMode: t.delivery_mode,
    location: t.location,
    deadline: t.deadline,
    budget: t.budget,
    status: t.status,
    quotes,
    acceptedQuote,
    referencePhotos: t.reference_photos,
    pin: t.pin ?? undefined,
    proofPhotoUrl: t.proof_photo_path ?? undefined,
    deliveredAt: t.delivered_at ?? undefined,
    autoReleaseAt: t.auto_release_at ?? undefined,
    completedAt: t.completed_at ?? undefined,
    cancelledAt: t.cancelled_at ?? undefined,
    cancelReason: t.cancel_reason ?? undefined,
    rating,
    createdAt: t.created_at,
  };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function fetchMyTasks(): Promise<CustomerTask[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data as DbTask[]).map(mapTask));
}

export interface PostTaskInput {
  title: string;
  category: CustomerTask["category"];
  description: string;
  deliveryMode: CustomerTask["deliveryMode"];
  location: string;
  town: "Rustenburg" | "Johannesburg" | "Pretoria";
  deadline: string; // ISO
  budget: number | null;
  referencePhotoFiles: File[];
}

export async function postTask(input: PostTaskInput): Promise<CustomerTask> {
  const { data: sessionData } = await supabase.auth.getSession();
  const customerId = sessionData.session?.user.id;
  if (!customerId) throw new Error("Not logged in");

  // Upload reference photos first (public within the task-photos bucket via
  // signed URL, private bucket).
  const photoPaths: string[] = [];
  for (const file of input.referencePhotoFiles) {
    const path = `${customerId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("task-photos").upload(path, file);
    if (error) throw error;
    photoPaths.push(path);
  }

  const pin = input.deliveryMode === "person" ? String(Math.floor(1000 + Math.random() * 9000)) : null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      customer_id: customerId,
      title: input.title,
      category: input.category,
      description: input.description,
      delivery_mode: input.deliveryMode,
      location: input.location,
      town: input.town,
      deadline: input.deadline,
      budget: input.budget,
      reference_photos: photoPaths,
      pin,
    })
    .select()
    .single();
  if (error) throw error;

  // TODO: fan this job out to nearby runners (e.g. a Postgres function +
  // realtime channel, or a push-notification edge function) so they can
  // submit quotes. Quotes are inserted by runners via their own dashboard —
  // see backend/runner.ts.

  return mapTask(data as DbTask);
}

export async function updateTaskDetails(taskDisplayId: string, patch: Partial<PostTaskInput>) {
  const { error } = await supabase
    .from("tasks")
    .update({
      title: patch.title,
      category: patch.category,
      description: patch.description,
      delivery_mode: patch.deliveryMode,
      location: patch.location,
      deadline: patch.deadline,
      budget: patch.budget,
    })
    .eq("display_id", taskDisplayId);
  if (error) throw error;
}

export async function deleteTask(taskDisplayId: string) {
  const { error } = await supabase.from("tasks").delete().eq("display_id", taskDisplayId);
  if (error) throw error;
}

export async function cancelTask(taskDisplayId: string, reason: string) {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq("display_id", taskDisplayId);
  if (error) throw error;
}

export async function requestCancelWithRefund(taskDisplayId: string) {
  // Escrowed funds require supervisor/admin review before refunding — this
  // just flags it; see backend/admin.ts `resolveDispute` for the payout side.
  const { error } = await supabase
    .from("tasks")
    .update({ status: "disputed", cancel_reason: "Customer requested cancellation — refund pending review" })
    .eq("display_id", taskDisplayId);
  if (error) throw error;
}

export async function raiseDispute(taskDisplayId: string) {
  const { error } = await supabase.from("tasks").update({ status: "disputed" }).eq("display_id", taskDisplayId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

/** Accept a quote — moves funds into escrow via the accept_quote RPC. */
export async function acceptQuote(taskDisplayId: string, quoteId: string) {
  const { data: task, error: taskErr } = await supabase.from("tasks").select("id").eq("display_id", taskDisplayId).single();
  if (taskErr) throw taskErr;
  const { error } = await supabase.rpc("accept_quote", { p_task_id: task.id, p_quote_id: quoteId });
  if (error) throw error; // surface "Insufficient wallet balance" etc. to the UI
}

export async function counterQuote(quoteId: string, amount: number) {
  const { error } = await supabase.from("quotes").update({ status: "awaiting_runner" }).eq("id", quoteId);
  if (error) throw error;
  const { error: histError } = await supabase.from("quote_history").insert({ quote_id: quoteId, by: "customer", price: amount });
  if (histError) throw histError;
  // Runner responds asynchronously from their own dashboard (updates
  // quotes.status back to 'open' with a new price) — see backend/runner.ts.
}

/** Customer approves completed work — releases escrow via RPC. */
export async function approveAndRelease(taskDisplayId: string) {
  const { data: task, error: taskErr } = await supabase.from("tasks").select("id").eq("display_id", taskDisplayId).single();
  if (taskErr) throw taskErr;
  const { error } = await supabase.rpc("approve_and_release", { p_task_id: task.id });
  if (error) throw error;
}

export async function submitRating(taskDisplayId: string, stars: number, comment: string) {
  const { data: task, error: taskErr } = await supabase.from("tasks").select("id").eq("display_id", taskDisplayId).single();
  if (taskErr) throw taskErr;
  const { error } = await supabase.from("task_ratings").insert({ task_id: task.id, stars, comment });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export async function fetchWallet(): Promise<{ balance: number; transactions: WalletTransaction[] }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const customerId = sessionData.session?.user.id;
  if (!customerId) throw new Error("Not logged in");

  const { data: walletRow, error: walletErr } = await supabase.from("wallets").select("balance").eq("customer_id", customerId).single();
  if (walletErr) throw walletErr;

  const { data: txRows, error: txErr } = await supabase
    .from("wallet_transactions")
    .select("*, tasks(display_id)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });
  if (txErr) throw txErr;

  const transactions: WalletTransaction[] = (txRows as any[]).map((t) => ({
    id: t.id,
    taskId: t.tasks?.display_id,
    type: t.type,
    amount: Number(t.amount),
    date: t.created_at,
    description: t.description,
  }));

  return { balance: Number(walletRow.balance), transactions };
}

/**
 * Top up the wallet. IMPORTANT: in production this should NOT be called
 * directly from the client with an arbitrary amount — that would let anyone
 * credit their own wallet for free. Wire this behind a real payment
 * provider's webhook (PayFast/Yoco/Stripe) that calls the `wallet_topup` RPC
 * server-side (e.g. from a Supabase Edge Function) only after payment is
 * confirmed. This client-side call is left in for local/dev testing only.
 */
export async function devTopUpWallet(amount: number) {
  const { data: sessionData } = await supabase.auth.getSession();
  const customerId = sessionData.session?.user.id;
  if (!customerId) throw new Error("Not logged in");
  const { error } = await supabase.rpc("wallet_topup", { p_customer_id: customerId, p_amount: amount });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Settings / saved locations
// ---------------------------------------------------------------------------

export async function fetchMyProfile(): Promise<{ name: string; surname: string; idNumber: string; address: string; phone: string; email: string; notifyTaskUpdates: boolean; notifyPromotions: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("customer_profiles")
    .select("id_number, address, notify_task_updates, notify_promotions, profiles(name, surname, phone, email)")
    .eq("id", userId)
    .single();
  if (error) throw error;
  const p = (data as any).profiles;
  return {
    name: p?.name ?? "",
    surname: p?.surname ?? "",
    idNumber: data.id_number,
    address: data.address,
    phone: p?.phone ?? "",
    email: p?.email ?? "",
    notifyTaskUpdates: data.notify_task_updates,
    notifyPromotions: data.notify_promotions,
  };
}

export async function updateCustomerProfile(patch: {
  name: string; surname: string; phone: string; email: string;
  notifyTaskUpdates: boolean; notifyPromotions: boolean;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not logged in");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ name: patch.name, surname: patch.surname, phone: patch.phone, email: patch.email })
    .eq("id", userId);
  if (profileErr) throw profileErr;

  const { error: customerErr } = await supabase
    .from("customer_profiles")
    .update({ notify_task_updates: patch.notifyTaskUpdates, notify_promotions: patch.notifyPromotions })
    .eq("id", userId);
  if (customerErr) throw customerErr;
}

export async function saveLocation(label: string, address: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const customerId = sessionData.session?.user.id;
  if (!customerId) throw new Error("Not logged in");
  const { error } = await supabase.from("saved_locations").insert({ customer_id: customerId, label, address });
  if (error) throw error;
}

export async function fetchSavedLocations() {
  const { data, error } = await supabase.from("saved_locations").select("label, address");
  if (error) throw error;
  return data;
}