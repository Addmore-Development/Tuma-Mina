import { useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import type { CustomerTask, Quote } from "../../types/types";
import CustomerStatusBadge from "./CustomerStatusBadge";
import { IconAlert, IconCamera, IconCheck, IconClock, IconPin, IconStar } from "../icons";

const AUTO_RELEASE_HOURS = 72;

interface TaskDetailProps {
  task: CustomerTask;
  onBack: () => void;
  onUpdate: (task: CustomerTask) => void;
  onOpenRating: () => void;
}

function formatCountdown(target: string) {
  const diffMs = new Date(target).getTime() - Date.now();
  if (diffMs <= 0) return "any moment now";
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hrs}h ${mins}m`;
}

export default function TaskDetail({ task, onBack, onUpdate, onOpenRating }: TaskDetailProps) {
  const [, forceTick] = useState(0);

  // Re-render every minute so the auto-release countdown stays accurate.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

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

  function acceptQuote(quote: Quote) {
    // TODO: POST /api/tasks/:id/accept-quote — this is also the point the backend
    // should move `quote.price` from the customer's available wallet balance into escrow.
    onUpdate({ ...task, status: "accepted", acceptedQuote: quote });
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
    // TODO: POST /api/tasks/:id/approve — releases the held amount to the runner's
    // payout balance and closes out the escrow hold.
    onUpdate({ ...task, status: "completed", completedAt: new Date().toISOString() });
    onOpenRating();
  }

  function raiseDispute() {
    // TODO: POST /api/tasks/:id/dispute — routes this to a supervisor for review.
    onUpdate({ ...task, status: "disputed" });
  }

  return (
    <div className="max-w-[760px]">
      <button onClick={onBack} className="text-[13.5px] text-ink-soft hover:text-indigo-600 font-medium mb-5 inline-flex items-center gap-1.5">
        ← Back to my tasks
      </button>

      <div className="flex items-start justify-between gap-4 mb-1.5">
        <h2 className="text-[24px]">{task.title}</h2>
        <CustomerStatusBadge status={task.status} />
      </div>
      <p className="text-ink-soft text-[13.5px] mb-6">
        {task.id} · {task.category} · Needed by {new Date(task.deadline).toLocaleString()}
      </p>

      {/* Status stepper */}
      {currentStepIndex >= 0 && (
        <div className="flex items-center mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
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
          <p className="text-[13.5px]">This task has been flagged and sent to a supervisor for review. We'll update the status here once it's resolved.</p>
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

          {/* Quotes / accept */}
          {task.status === "posted" && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-2.5">
                {task.quotes.length ? "Quotes from nearby runners" : "Waiting on quotes from nearby runners…"}
              </h3>
              <div className="flex flex-col gap-2.5">
                {task.quotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3.5 border-[1.5px] border-line rounded-xl">
                    <div>
                      <p className="text-[13.5px] font-semibold">{q.runnerName}</p>
                      <p className="text-[12px] text-ink-soft flex items-center gap-1">
                        <IconStar className="w-3 h-3" filled /> {q.runnerRating.toFixed(1)}
                        {q.note ? ` · ${q.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[15px] font-bold">R{q.price}</span>
                      <Button size="md" onClick={() => acceptQuote(q)}>Accept</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.acceptedQuote && task.status !== "posted" && (
            <div className="mb-6 p-3.5 rounded-xl bg-lavender-100 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-ink-soft">Runner assigned</p>
                <p className="text-[14.5px] font-semibold">{task.acceptedQuote.runnerName}</p>
              </div>
              <span className="text-[16px] font-bold">R{task.acceptedQuote.price}</span>
            </div>
          )}

          {task.deliveryMode === "person" && task.pin && task.status !== "posted" && task.status !== "completed" && (
            <div className="mb-6 p-3.5 rounded-xl border-[1.5px] border-dashed border-line">
              <p className="text-[13px] font-semibold mb-1 flex items-center gap-1.5"><IconPin className="w-4 h-4" /> Hand-off PIN</p>
              <p className="text-[12.5px] text-ink-soft mb-2">Give this PIN to the receiver — the runner enters it on delivery to confirm the hand-off.</p>
              <span className="text-[20px] font-mono tracking-[6px] font-bold">{task.pin}</span>
            </div>
          )}

          {task.status === "in_progress" && (
            <div className="mb-6 flex items-center gap-2.5 text-[13.5px] text-ink-soft">
              <IconClock className="w-4 h-4" /> Your runner is on the job.
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
                  If we don't hear from you, payment auto-releases to the runner in <strong>{formatCountdown(task.autoReleaseAt)}</strong>.
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="primary" onClick={approveAndRelease}>Approve &amp; release payment</Button>
                <Button variant="ghost" onClick={raiseDispute}>Something's wrong</Button>
              </div>
            </div>
          )}

          {task.status === "completed" && (
            <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-[#e9faf1] text-[#1f9d5c] text-[13.5px]">
              <IconCheck className="w-5 h-5 flex-shrink-0" /> Payment released. This task is complete.
              {!task.rating && (
                <button onClick={onOpenRating} className="ml-auto underline font-semibold">Rate your runner</button>
              )}
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
    </div>
  );
}
