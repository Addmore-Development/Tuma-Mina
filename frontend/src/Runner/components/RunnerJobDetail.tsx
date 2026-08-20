import { useState } from "react";
import Button from "../../components/Button";
import ConfirmDialog from "../../Customer/components/ConfirmDialog";
import { IconAlert, IconCamera, IconCheck, IconClock, IconPin } from "../../Customer/icons";
import { getErrorMessage } from "../../lib/getErrorMessage";
import {
  markInProgress,
  markDelivered,
  confirmPinHandoff,
  submitCourierProof,
  cancelAcceptedJob,
} from "../../lib/supabase/runner";
import type { PlatformJob } from "../../types/platform";

interface RunnerJobDetailProps {
  job: PlatformJob;
  onBack: () => void;
  onUpdated: () => Promise<void> | void;
}

const COURIER_PROVIDERS = ["Courier Guy", "Pexi"] as const;

function formatCountdown(target: string) {
  const diffMs = new Date(target).getTime() - Date.now();
  if (diffMs <= 0) return "any moment now";
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hrs}h ${mins}m`;
}

export default function RunnerJobDetail({ job, onBack, onUpdated }: RunnerJobDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Proof-of-delivery form state
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [locating, setLocating] = useState(false);
  const [capturedCoords, setCapturedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pin, setPin] = useState("");
  const [courierProvider, setCourierProvider] = useState<string>(COURIER_PROVIDERS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onUpdated();
    } catch (e) {
      setError(getErrorMessage(e, fallback));
    } finally {
      setBusy(false);
    }
  }

  function handleStart() {
    run(() => markInProgress(job.id), "Couldn't start this job.");
  }

  function handleCancel() {
    setConfirmCancel(false);
    run(() => cancelAcceptedJob(job.id), "Couldn't cancel this job.");
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError("Location isn't available on this device — you can still submit the photo.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCapturedCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — check location permissions and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  function handleSubmitLocationProof() {
    if (!proofPhoto) {
      setError("Add a photo of the drop-off before submitting.");
      return;
    }
    run(
      () => markDelivered(job.id, proofPhoto, capturedCoords ?? undefined),
      "Couldn't submit proof of delivery."
    );
  }

  function handleSubmitPin() {
    if (pin.trim().length !== 4) {
      setError("Enter the 4-digit PIN the receiver gave you.");
      return;
    }
    run(() => confirmPinHandoff(job.id, pin.trim()), "That PIN didn't match — check with the receiver and try again.");
  }

  function handleSubmitCourier() {
    if (!trackingNumber.trim()) {
      setError("Enter the tracking number.");
      return;
    }
    run(() => submitCourierProof(job.id, courierProvider, trackingNumber.trim()), "Couldn't submit tracking details.");
  }

  const deliveryModeLabel =
    job.deliveryMode === "person" ? "Hand to a person" : job.deliveryMode === "courier" ? "Courier / Paxi" : "Drop at a location";

  return (
    <div className="max-w-[760px]">
      <button onClick={onBack} className="text-[13.5px] text-ink-soft hover:text-indigo-600 font-medium mb-5 inline-flex items-center gap-1.5">
        ← Back to my jobs
      </button>

      <div className="flex items-start justify-between gap-4 mb-1.5 flex-wrap">
        <h2 className="text-[22px] sm:text-[24px] break-words">{job.title}</h2>
        <StatusPill status={job.status} />
      </div>
      <p className="text-ink-soft text-[13.5px] mb-6">
        {job.id} · {job.category} · Due {new Date(job.deadline).toLocaleString()}
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-[#fdeaea] text-[#a83232] p-3.5 rounded-xl mb-5 text-[13px]">
          <IconAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {job.cancelReason && ["disputed", "cancelled"].includes(job.status) && (
        <div className="flex items-start gap-2.5 bg-[#f1f1f5] text-ink-soft p-3.5 rounded-xl mb-5 text-[13px]">
          <IconAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> {job.cancelReason}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
        <div>
          {job.description && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-1.5">Details</h3>
              <p className="text-[14px] text-ink-soft leading-relaxed">{job.description}</p>
            </div>
          )}

          {!!job.referencePhotos?.length && (
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold mb-2.5">Reference photos</h3>
              <div className="flex flex-wrap gap-3">
                {job.referencePhotos.map((url) => (
                  <img key={url} src={url} alt="Reference" className="w-20 h-20 rounded-xl object-cover border-[1.5px] border-line" />
                ))}
              </div>
            </div>
          )}

          {job.status === "accepted" && (
            <div className="mb-6 p-4 rounded-xl bg-lavender-100">
              <p className="text-[13.5px] font-semibold mb-1">You're on this job</p>
              <p className="text-[12.5px] text-ink-soft mb-3">
                {job.funded
                  ? "Payment is already held in escrow — start whenever you're ready."
                  : "The customer hasn't funded this job yet. You can still start — payment gets held once they do."}
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button size="md" onClick={handleStart} disabled={busy}>{busy ? "Starting..." : "Start job"}</Button>
                <Button size="md" variant="ghost" onClick={() => setConfirmCancel(true)} disabled={busy} className="!text-[#a83232] hover:!border-[#a83232]">
                  Cancel job
                </Button>
              </div>
            </div>
          )}

          {job.status === "in_progress" && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft mb-4">
                <IconClock className="w-4 h-4" /> Job in progress — submit proof once it's done.
              </div>

              {job.deliveryMode === "location" && (
                <div className="p-4 rounded-xl border-[1.5px] border-line mb-4">
                  <p className="text-[13px] font-semibold mb-2.5 flex items-center gap-1.5"><IconCamera className="w-4 h-4" /> Photo + location proof</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setProofPhoto(e.target.files?.[0] ?? null)}
                    className="text-[13px] mb-3 block"
                  />
                  <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    <Button size="md" variant="ghost" onClick={captureLocation} disabled={locating}>
                      {locating ? "Getting location..." : capturedCoords ? "Location captured ✓" : "Capture my location"}
                    </Button>
                    {capturedCoords && (
                      <span className="text-[12px] text-ink-soft">
                        {capturedCoords.lat.toFixed(5)}, {capturedCoords.lng.toFixed(5)}
                      </span>
                    )}
                  </div>
                  <Button size="md" onClick={handleSubmitLocationProof} disabled={busy}>
                    {busy ? "Submitting..." : "Submit proof of drop-off"}
                  </Button>
                </div>
              )}

              {job.deliveryMode === "person" && (
                <div className="p-4 rounded-xl border-[1.5px] border-line mb-4">
                  <p className="text-[13px] font-semibold mb-2.5 flex items-center gap-1.5"><IconPin className="w-4 h-4" /> Hand-off PIN</p>
                  <p className="text-[12.5px] text-ink-soft mb-3">Ask the receiver for the 4-digit PIN the customer gave them, and enter it here.</p>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="0000"
                      className="w-[120px] px-3 py-2 border-[1.5px] border-line rounded-lg text-[18px] font-mono tracking-[4px] text-center focus:outline-none focus:border-indigo-500"
                    />
                    <Button size="md" onClick={handleSubmitPin} disabled={busy}>{busy ? "Confirming..." : "Confirm hand-off"}</Button>
                  </div>
                </div>
              )}

              {job.deliveryMode === "courier" && (
                <div className="p-4 rounded-xl border-[1.5px] border-line mb-4">
                  <p className="text-[13px] font-semibold mb-2.5">Courier tracking details</p>
                  <div className="flex flex-col gap-2.5 max-w-[320px]">
                    <select
                      value={courierProvider}
                      onChange={(e) => setCourierProvider(e.target.value)}
                      className="px-3 py-2 border-[1.5px] border-line rounded-lg text-[14px] focus:outline-none focus:border-indigo-500"
                    >
                      {COURIER_PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Tracking number"
                      className="px-3 py-2 border-[1.5px] border-line rounded-lg text-[14px] focus:outline-none focus:border-indigo-500"
                    />
                    <Button size="md" onClick={handleSubmitCourier} disabled={busy}>{busy ? "Submitting..." : "Submit tracking number"}</Button>
                  </div>
                </div>
              )}

              <Button size="md" variant="ghost" onClick={() => setConfirmCancel(true)} disabled={busy} className="!text-[#a83232] hover:!border-[#a83232]">
                Cancel job
              </Button>
            </div>
          )}

          {job.status === "awaiting_confirmation" && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 p-3.5 border-[1.5px] border-line rounded-xl text-[13.5px] text-ink-soft mb-3">
                <IconCheck className="w-5 h-5 flex-shrink-0 text-brand-green" />
                {job.deliveryMode === "courier"
                  ? `Submitted — ${job.courierProvider ?? "Courier"} tracking ${job.trackingNumber ?? ""}`
                  : job.deliveryMode === "person"
                  ? "PIN confirmed by receiver."
                  : "Photo and location submitted."}
              </div>
              {job.autoReleaseAt && (
                <p className="text-[12.5px] text-ink-soft">
                  Waiting on the customer to confirm. If they don't, payment auto-releases to you in{" "}
                  <strong>{formatCountdown(job.autoReleaseAt)}</strong>.
                </p>
              )}
            </div>
          )}

          {job.status === "completed" && (
            <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-[#e9faf1] text-[#1f9d5c] text-[13.5px]">
              <IconCheck className="w-5 h-5 flex-shrink-0" /> Payment released — you earned R{(job.price - job.platformFee).toFixed(2)} on this job.
            </div>
          )}
        </div>

        {/* Side summary card */}
        <div className="bg-lavender-100 rounded-2xl p-4 h-fit">
          <p className="text-[12px] text-ink-soft mb-1">Customer</p>
          <p className="text-[13.5px] font-medium mb-3">{job.customerName}</p>
          <p className="text-[12px] text-ink-soft mb-1">Location</p>
          <p className="text-[13.5px] font-medium mb-3">{job.location}</p>
          <p className="text-[12px] text-ink-soft mb-1">Delivery type</p>
          <p className="text-[13.5px] font-medium mb-3">{deliveryModeLabel}</p>
          <p className="text-[12px] text-ink-soft mb-1">You'll earn</p>
          <p className="text-[15px] font-bold">R{(job.price - job.platformFee).toFixed(2)}</p>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel this job?"
          description={
            job.funded
              ? "This job is funded — cancelling refunds the customer and reopens the job for other runners."
              : "This reopens the job for other runners to accept."
          }
          confirmLabel="Cancel job"
          tone="danger"
          onConfirm={handleCancel}
          onClose={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: PlatformJob["status"] }) {
  const map: Record<PlatformJob["status"], { label: string; classes: string }> = {
    posted: { label: "Posted", classes: "bg-lavender-100 text-indigo-600" },
    accepted: { label: "Accepted", classes: "bg-[#fff2ea] text-coral-dark" },
    in_progress: { label: "In progress", classes: "bg-[#fff2ea] text-coral-dark" },
    awaiting_confirmation: { label: "Awaiting confirmation", classes: "bg-lavender-100 text-indigo-600" },
    completed: { label: "Completed", classes: "bg-[#e9faf1] text-[#1f9d5c]" },
    disputed: { label: "Disputed", classes: "bg-[#fdeaea] text-[#d64545]" },
    cancelled: { label: "Cancelled", classes: "bg-[#f1f1f5] text-ink-soft" },
  };
  const c = map[status];
  return <span className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full whitespace-nowrap ${c.classes}`}>{c.label}</span>;
}