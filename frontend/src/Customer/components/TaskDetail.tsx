import { useMemo, useState } from "react";
import Button from "../../components/Button";
import type { CustomerTask, Quote } from "../../types/types";
import CustomerStatusBadge from "./CustomerStatusBadge";
import ConfirmDialog from "./ConfirmDialog";
import { IconAlert, IconCamera, IconCheck, IconClock, IconEdit, IconPin, IconPrint, IconRepeat, IconStar, IconTrash } from "../icons";
import { useNow } from "../useNow";
import { formatRelativeTime } from "../formatRelativeTime";

const AUTO_RELEASE_HOURS = 72;
const DUE_SOON_HOURS = 3;
const COUNTER_ACCEPT_THRESHOLD = 0.85; // runner auto-accepts a counter within 15% of their ask

interface TaskDetailProps {
  task: CustomerTask;
  balance: number;
  onBack: () => void;
  onUpdate: (task: CustomerTask) => void;
  onApprove: () => void;
  onOpenRating: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onNavigateToWallet: (suggestedTopUp?: number) => void;
  onToast: (text: string, tone?: "success" | "error" | "info") => void;
}

function formatCountdown(target: string, now: number) {
  const diffMs = new Date(target).getTime() - now;
  if (diffMs <= 0) return "any moment now";
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hrs}h ${mins}m`;
}

export default function TaskDetail({ task, balance, onBack, onUpdate, onApprove, onOpenRating, onEdit, onDelete, onDuplicate, onNavigateToWallet, onToast }: TaskDetailProps) {
  const [counteringId, setCounteringId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [pendingQuoteIds, setPendingQuoteIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"cancel" | "cancel-refund" | "delete" | null>(null);
  const [quoteSort, setQuoteSort] = useState<"default" | "price" | "rating">("default");

  const steps = useMemo(
    () => [
      { key: "posted", label: "Posted" },
      { key: "accepted", label: "Runner confirmed" },
      { key: "in_progress", label: "In progress" },
      { key: "awaiting_confirmation", label: "Delivered" },
      { key: "completed", label: "Completed" },
    ],
    []
  );
  const stepOrder = ["posted", "accepted", "in_progress", "awaiting_confirmation", "completed"];
  const currentStepIndex = task.status === "disputed" || task.status === "cancelled" ? -1 : stepOrder.indexOf(task.status);
  const now = useNow();
  const isClosed = ["completed", "cancelled", "disputed"].includes(task.status);
  const msUntilDeadline = new Date(task.deadline).getTime() - now;
  const overdue = !isClosed && msUntilDeadline < 0;
  const dueSoon = !isClosed && !overdue && msUntilDeadline <= DUE_SOON_HOURS * 3_600_000;

  const sortedQuotes = useMemo(() => {
    const list = [...task.quotes];
    if (quoteSort === "price") list.sort((a, b) => a.price - b.price);
    if (quoteSort === "rating") list.sort((a, b) => b.runnerRating - a.runnerRating);
    return list;
  }, [task.quotes, quoteSort]);

  function updateQuote(quoteId: string, patch: Partial<Quote>) {
    onUpdate({ ...task, quotes: task.quotes.map((q) => (q.id === quoteId ? { ...q, ...patch } : q)) });
  }

  function acceptQuote(quote: Quote) {
    if (quote.price > balance) {
      onToast(`You need R${(quote.price - balance).toFixed(2)} more in your wallet to accept this quote.`, "error");
      return;
    }
    // TODO: POST /api/tasks/:id/accept-quote — this is also the point the backend
    // should move `quote.price` from the customer's available wallet balance into escrow.
    onUpdate({ ...task, status: "accepted", acceptedQuote: { ...quote, status: "open" } });
    onToast(`${quote.runnerName} is on the job.`, "success");
  }

  function startCounter(quote: Quote) {
    setCounteringId(quote.id);
    setCounterAmount(String(quote.price));
  }

  function submitCounter(quote: Quote) {
    const amount = Number(counterAmount);
    if (!amount || amount <= 0) {
      onToast("Enter a valid counter offer.", "error");
      return;
    }
    const now = new Date().toISOString();
    updateQuote(quote.id, {
      status: "awaiting_runner",
      history: [...(quote.history ?? []), { by: "customer", price: amount, at: now }],
    });
    setCounteringId(null);
    setPendingQuoteIds((prev) => new Set(prev).add(quote.id));

    // Dev preview: stands in for the runner's response until a real runner app exists.
    // TODO: replace with the runner's actual reply coming back over the API/websocket.
    setTimeout(() => {
      const accept = amount >= quote.price * COUNTER_ACCEPT_THRESHOLD;
      const resolvedPrice = accept ? amount : Math.round((quote.price + amount) / 2);
      updateQuote(quote.id, {
        price: resolvedPrice,
        status: "open",
        history: [...(quote.history ?? []), { by: "customer", price: amount, at: now }, { by: "runner", price: resolvedPrice, at: new Date().toISOString(), note: accept ? "Accepted your offer" : "Countered back" }],
      });
      setPendingQuoteIds((prev) => {
        const next = new Set(prev);
        next.delete(quote.id);
        return next;
      });
      onToast(accept ? `${quote.runnerName} accepted your offer of R${amount}.` : `${quote.runnerName} countered at R${resolvedPrice}.`, "info");
    }, 1800);
  }

  // Dev-only helpers standing in for actions that, in production, come from the runner's
  // app (marking in-progress, uploading proof / entering the PIN). Safe to delete once
  // the runner side and real-time updates exist — nothing here is customer-facing copy.
  function simulateInProgress() {
    onUpdate({ ...task, status: "in_progress" });
  }
  function simulateDelivered() {
    const deliveredAt = new Date().toISOString();
    const autoReleaseAt = new Date(Date.now() + AUTO_RELEASE_HOURS * 3_600_000).toISOString();
    onUpdate({
      ...task,
      status: "awaiting_confirmation",
      deliveredAt,
      autoReleaseAt,
      proofPhotoUrl: task.deliveryMode === "location" ? "mock-proof-photo" : undefined,
    });
  }

  function approveAndRelease() {
    onApprove();
  }

  function raiseDispute() {
    // TODO: POST /api/tasks/:id/dispute — routes this to a supervisor for review.
    onUpdate({ ...task, status: "disputed" });
    onToast("Sent to a supervisor for review.", "info");
  }

  function confirmCancel() {
    onUpdate({ ...task, status: "cancelled", cancelledAt: new Date().toISOString(), cancelReason: "Cancelled before a runner was assigned" });
    onToast("Task cancelled.", "success");
    setConfirmAction(null);
  }

  function confirmCancelWithRefund() {
    // Funds are already held in escrow at this point, so this needs a supervisor
    // to approve the refund rather than releasing it automatically.
    onUpdate({ ...task, status: "disputed", cancelReason: "Customer requested cancellation — refund pending review" });
    onToast("Cancellation requested — a supervisor will review your refund.", "info");
    setConfirmAction(null);
  }

  function confirmDelete() {
    onDelete();
    setConfirmAction(null);
  }

  return (
    <div className="max-w-[760px]">
      <button onClick={onBack} className="text-[13.5px] text-ink-soft hover:text-indigo-600 font-medium mb-5 inline-flex items-center gap-1.5">
        ← Back to my tasks
      </button>

      <div className="flex items-start justify-between gap-4 mb-1.5 flex-wrap">
        <h2 className="text-[22px] sm:text-[24px] break-words">{task.title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {overdue && (
            <span className="inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[11.5px] font-semibold bg-[#fdeaea] text-[#a83232] whitespace-nowrap">
              <IconAlert className="w-3.5 h-3.5" /> Overdue
            </span>
          )}
          {dueSoon && (
            <span className="inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[11.5px] font-semibold bg-[#fff4e0] text-[#a86a1a] whitespace-nowrap">
              <IconClock className="w-3.5 h-3.5" /> Due soon
            </span>
          )}
          <CustomerStatusBadge status={task.status} />
        </div>
      </div>
      <p className="text-ink-soft text-[13.5px] mb-6">
        {task.id} · {task.category} · Needed by {new Date(task.deadline).toLocaleString()} ({formatRelativeTime(task.deadline, now)})
      </p>

      {/* Status stepper */}
      {currentStepIndex >= 0 && (
        <div className="flex items-center mb-8 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none min-w-[64px]">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    i <= currentStepIndex ? "bg-indigo-950 text-white" : "bg-lavender-100 text-ink-soft"
                  }`}
                >
                  {i < currentStepIndex ? <IconCheck className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-[10.5px] text-ink-soft text-center w-[70px] leading-tight">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-[2px] flex-1 mx-1 mb-[18px] ${i < currentStepIndex ? "bg-indigo-950" : "bg-line"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {task.status === "disputed" && (
        <div className="flex items-start gap-3 bg-[#fdeaea] text-[#a83232] p-4 rounded-xl mb-6">
          <IconAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-[13.5px]">
            {task.cancelReason ?? "This task has been flagged and sent to a supervisor for review."} We'll update the status here once it's resolved.
          </p>
        </div>
      )}

      {task.status === "cancelled" && (
        <div className="flex items-start gap-3 bg-[#f1f1f5] text-ink-soft p-4 rounded-xl mb-6">
          <IconAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-[13.5px]">{task.cancelReason ?? "This task was cancelled."}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
        <div>
          {task.description && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-1.5">Details</h3>
              <p className="text-[14px] text-ink-soft leading-relaxed">{task.description}</p>
            </div>
          )}

          {!!task.referencePhotos?.length && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-2.5">Reference photos</h3>
              <div className="flex flex-wrap gap-3">
                {task.referencePhotos.map((url) => (
                  <img key={url} src={url} alt="Reference" className="w-20 h-20 rounded-xl object-cover border-[1.5px] border-line" />
                ))}
              </div>
            </div>
          )}

          {/* Quotes / accept / negotiate */}
          {task.status === "posted" && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
                <h3 className="text-[13px] font-semibold">
                  {task.quotes.length ? "Quotes from nearby runners" : "Waiting on quotes from nearby runners…"}
                </h3>
                {task.quotes.length > 1 && (
                  <div className="flex bg-lavender-100 p-0.5 rounded-full">
                    {(["default", "price", "rating"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQuoteSort(s)}
                        className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize transition ${
                          quoteSort === s ? "bg-white text-indigo-600 shadow-sm2" : "text-ink-soft"
                        }`}
                      >
                        {s === "default" ? "Newest" : s === "price" ? "Lowest price" : "Top rated"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {sortedQuotes.map((q) => {
                  const insufficient = q.price > balance;
                  const isCountering = counteringId === q.id;
                  const isPending = pendingQuoteIds.has(q.id);
                  return (
                    <div key={q.id} className="p-3.5 border-[1.5px] border-line rounded-xl">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-[13.5px] font-semibold">{q.runnerName}</p>
                          <p className="text-[12px] text-ink-soft flex items-center gap-1">
                            <IconStar className="w-3 h-3" filled /> {q.runnerRating.toFixed(1)}
                            {q.note ? ` · ${q.note}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[15px] font-bold">R{q.price}</span>
                          {!isCountering && !isPending && (
                            <>
                              <Button size="md" variant="ghost" onClick={() => startCounter(q)}>Counter</Button>
                              <Button size="md" onClick={() => acceptQuote(q)}>Accept</Button>
                            </>
                          )}
                        </div>
                      </div>

                      {isPending && (
                        <p className="text-[12.5px] text-ink-soft mt-2.5 flex items-center gap-1.5">
                          <IconClock className="w-3.5 h-3.5" /> Waiting on {q.runnerName} to respond to your offer…
                        </p>
                      )}

                      {isCountering && (
                        <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                          <input
                            type="number"
                            min={1}
                            autoFocus
                            value={counterAmount}
                            onChange={(e) => setCounterAmount(e.target.value)}
                            className="w-[120px] px-3 py-2 border-[1.5px] border-line rounded-lg text-[14px] focus:outline-none focus:border-indigo-500"
                          />
                          <Button size="md" onClick={() => submitCounter(q)}>Send offer</Button>
                          <Button size="md" variant="ghost" onClick={() => setCounteringId(null)}>Cancel</Button>
                        </div>
                      )}

                      {insufficient && !isCountering && !isPending && (
                        <div className="mt-2.5 flex items-center gap-2 text-[12.5px] text-[#a83232]">
                          <IconAlert className="w-3.5 h-3.5 flex-shrink-0" />
                          Not enough in your wallet.
                          <button onClick={() => onNavigateToWallet(q.price - balance)} className="underline font-semibold">Add R{(q.price - balance).toFixed(2)}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-4">
                <Button size="md" variant="ghost" onClick={onEdit}><IconEdit className="w-3.5 h-3.5" /> Edit task</Button>
                <Button size="md" variant="ghost" onClick={() => setConfirmAction("cancel")} className="!text-[#a83232] hover:!border-[#a83232]">Cancel task</Button>
              </div>
            </div>
          )}

          {task.acceptedQuote && task.status !== "posted" && (
            <div className="mb-6 p-3.5 rounded-xl bg-lavender-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[13px] text-ink-soft">Runner assigned</p>
                <p className="text-[14.5px] font-semibold">{task.acceptedQuote.runnerName}</p>
              </div>
              <span className="text-[16px] font-bold">R{task.acceptedQuote.price}</span>
            </div>
          )}

          {task.deliveryMode === "person" && task.pin && task.status !== "posted" && task.status !== "completed" && task.status !== "cancelled" && (
            <div className="mb-6 p-3.5 rounded-xl border-[1.5px] border-dashed border-line">
              <p className="text-[13px] font-semibold mb-1 flex items-center gap-1.5"><IconPin className="w-4 h-4" /> Hand-off PIN</p>
              <p className="text-[12.5px] text-ink-soft mb-2">Give this PIN to the receiver — the runner enters it on delivery to confirm the hand-off.</p>
              <span className="text-[20px] font-mono tracking-[6px] font-bold">{task.pin}</span>
            </div>
          )}

          {(task.status === "accepted" || task.status === "in_progress") && (
            <div className="mb-6">
              {task.status === "in_progress" && (
                <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft mb-3">
                  <IconClock className="w-4 h-4" /> Your runner is on the job.
                </div>
              )}
              <Button size="md" variant="ghost" onClick={() => setConfirmAction("cancel-refund")} className="!text-[#a83232] hover:!border-[#a83232]">
                Cancel task
              </Button>
            </div>
          )}

          {task.status === "awaiting_confirmation" && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-2.5">Proof of completion</h3>
              {task.deliveryMode === "location" ? (
                <div className="flex items-center gap-2.5 p-3.5 border-[1.5px] border-line rounded-xl text-[13.5px] text-ink-soft mb-3">
                  <IconCamera className="w-5 h-5 flex-shrink-0" /> Photo uploaded by your runner as proof of drop-off.
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3.5 border-[1.5px] border-line rounded-xl text-[13.5px] text-ink-soft mb-3">
                  <IconCheck className="w-5 h-5 flex-shrink-0 text-brand-green" /> The receiver's PIN was entered correctly by your runner.
                </div>
              )}

              {task.autoReleaseAt && (
                <p className="text-[12.5px] text-ink-soft mb-4">
                  If we don't hear from you, payment auto-releases to the runner in <strong>{formatCountdown(task.autoReleaseAt, now)}</strong>.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="primary" onClick={approveAndRelease}>Approve &amp; release payment</Button>
                <Button variant="ghost" onClick={raiseDispute}>Something's wrong</Button>
              </div>
            </div>
          )}

          {task.status === "completed" && (
            <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-[#e9faf1] text-[#1f9d5c] text-[13.5px] flex-wrap">
              <IconCheck className="w-5 h-5 flex-shrink-0" /> Payment released. This task is complete.
              {!task.rating && (
                <button onClick={onOpenRating} className="ml-auto underline font-semibold">Rate your runner</button>
              )}
            </div>
          )}

          {task.status === "completed" && task.acceptedQuote && (
            <div className="mb-6 p-4 rounded-xl border-[1.5px] border-line">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold">Receipt</h3>
                <button onClick={() => window.print()} className="text-[12px] text-indigo-600 font-semibold flex items-center gap-1.5">
                  <IconPrint className="w-3.5 h-3.5" /> Print
                </button>
              </div>
              <div className="flex flex-col gap-1.5 text-[13px]">
                <ReceiptLine label="Task" value={`${task.title} (${task.id})`} />
                <ReceiptLine label="Runner" value={task.acceptedQuote.runnerName} />
                <ReceiptLine label="Paid from" value="Tuma-Mina wallet" />
                <ReceiptLine label="Completed" value={task.completedAt ? new Date(task.completedAt).toLocaleString() : "—"} />
                <div className="h-px bg-line my-1.5" />
                <ReceiptLine label="Total paid" value={`R${task.acceptedQuote.price.toFixed(2)}`} bold />
              </div>
            </div>
          )}

          {["completed", "cancelled"].includes(task.status) && (
            <Button size="md" variant="ghost" onClick={onDuplicate} className="mb-6"><IconRepeat className="w-3.5 h-3.5" /> Post again</Button>
          )}

          {task.rating && (
            <div className="mb-6 p-3.5 rounded-xl border-[1.5px] border-line">
              <p className="text-[13px] font-semibold mb-1.5">Your rating</p>
              <div className="flex gap-0.5 mb-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <IconStar key={n} className="w-4 h-4 text-coral" filled={n <= task.rating!.stars} />
                ))}
              </div>
              {task.rating.comment && <p className="text-[13px] text-ink-soft">{task.rating.comment}</p>}
            </div>
          )}

          {/* Dev-only: stand-in for runner-app actions until that side is built */}
          {(task.status === "accepted" || task.status === "in_progress") && (
            <div className="mt-2 p-3 rounded-xl border border-dashed border-line">
              <p className="text-[11px] uppercase tracking-wide text-ink-soft mb-2">Dev preview — simulates the runner's app</p>
              {task.status === "accepted" && <Button size="md" variant="ghost" onClick={simulateInProgress}>Simulate: runner starts the job</Button>}
              {task.status === "in_progress" && <Button size="md" variant="ghost" onClick={simulateDelivered}>Simulate: runner marks delivered</Button>}
            </div>
          )}

          {["completed", "cancelled", "disputed"].includes(task.status) && (
            <button
              onClick={() => setConfirmAction("delete")}
              className="mt-2 text-[12.5px] text-ink-soft hover:text-[#a83232] flex items-center gap-1.5"
            >
              <IconTrash className="w-3.5 h-3.5" /> Remove from history
            </button>
          )}
        </div>

        {/* Side summary card */}
        <div className="bg-lavender-100 rounded-2xl p-4 h-fit">
          <p className="text-[12px] text-ink-soft mb-1">Location</p>
          <p className="text-[13.5px] font-medium mb-3">{task.location}</p>
          <p className="text-[12px] text-ink-soft mb-1">Delivery type</p>
          <p className="text-[13.5px] font-medium mb-3">{task.deliveryMode === "location" ? "Drop at a location" : "Hand to a person"}</p>
          <p className="text-[12px] text-ink-soft mb-1">Budget</p>
          <p className="text-[13.5px] font-medium">{task.budget ? `R${task.budget}` : "Open to quotes"}</p>
        </div>
      </div>

      {confirmAction === "cancel" && (
        <ConfirmDialog
          title="Cancel this task?"
          description="No runner has been assigned yet, so nothing has been charged. This can't be undone."
          confirmLabel="Cancel task"
          tone="danger"
          onConfirm={confirmCancel}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "cancel-refund" && (
        <ConfirmDialog
          title="Cancel and request a refund?"
          description={`R${task.acceptedQuote?.price ?? 0} is currently held in escrow for this task. Cancelling now sends it to a supervisor to review and refund.`}
          confirmLabel="Request cancellation"
          tone="danger"
          onConfirm={confirmCancelWithRefund}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "delete" && (
        <ConfirmDialog
          title="Remove from history?"
          description="This will remove the task from your list. This can't be undone."
          confirmLabel="Remove"
          tone="danger"
          onConfirm={confirmDelete}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function ReceiptLine({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span className={bold ? "font-bold text-[14px]" : "font-medium"}>{value}</span>
    </div>
  );
}
