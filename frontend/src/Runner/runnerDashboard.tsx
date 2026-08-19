import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";
import type { PlatformJob, RunnerApplication } from "../types/platform";
import { fetchMyApplication, fetchAvailableJobs, fetchMyJobs, acceptAvailableJob } from "../lib/supabase/runner";
import { subscribeToTables, unsubscribe } from "../lib/supabase/realtime";
import { getErrorMessage } from "../lib/getErrorMessage";

type View = "available" | "myjobs" | "earnings" | "profile";

export default function RunnerDashboard() {
  const [application, setApplication] = useState<RunnerApplication | null>(null);
  const [availableJobs, setAvailableJobs] = useState<PlatformJob[]>([]);
  const [myJobs, setMyJobs] = useState<PlatformJob[]>([]);
  const [view, setView] = useState<View>("available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAcceptingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const app = await fetchMyApplication();
      setApplication(app);
      setError(null);

      if (app.status === "approved") {
        const [avail, mine] = await Promise.all([fetchAvailableJobs(app.town), fetchMyJobs()]);
        setAvailableJobs(avail);
        setMyJobs(mine);
      }
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load your runner data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const channels = subscribeToTables([{ table: "tasks" }, { table: "runner_applications" }], loadAll);
    return () => {
      unsubscribe(channels);
    };
  }, [loadAll]);

  // Runners only ever see jobs posted in their own town.
  const townJobs = availableJobs;

  const earnings = useMemo(() => {
    const completed = myJobs.filter((j) => j.status === "completed");
    const total = completed.reduce((sum, j) => sum + (j.price - j.platformFee), 0);
    return { total, jobCount: completed.length };
  }, [myJobs]);

  async function acceptJob(job: PlatformJob) {
    setAcceptingId(job.id);
    try {
      await acceptAvailableJob(job.id);
      await loadAll();
      setView("myjobs");
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't accept that job — it may already be taken."));
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-lavender-100 flex items-center justify-center">
        <p className="text-[13.5px] text-ink-soft">Loading your dashboard...</p>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-lavender-100 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-line p-8 max-w-[440px] text-center">
          <h2 className="text-[20px] mb-2">Couldn't load your dashboard</h2>
          <p className="text-[13.5px] text-ink-soft mb-5">{error}</p>
          <Link to="/login"><Button variant="ghost">Back to login</Button></Link>
        </div>
      </div>
    );
  }

  if (!application) return null;

  if (application.status === "pending") {
    return <ApplicationPendingScreen name={application.name} />;
  }

  if (application.status === "rejected") {
    return <ApplicationRejectedScreen name={application.name} reason={application.rejectionReason} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-screen bg-lavender-100">
      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mb-2.5 ml-2.5">
          Runner
        </div>
        <NavItem label="Available jobs" active={view === "available"} onClick={() => setView("available")} count={townJobs.length} />
        <NavItem label="My jobs" active={view === "myjobs"} onClick={() => setView("myjobs")} count={myJobs.filter((j) => j.status !== "completed").length} />
        <NavItem label="Earnings" active={view === "earnings"} onClick={() => setView("earnings")} />
        <NavItem label="Profile" active={view === "profile"} onClick={() => setView("profile")} />
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5 mt-2">
          Log out
        </Link>
        <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-full bg-coral flex-shrink-0 flex items-center justify-center text-[12px] font-bold">
            {application.name.charAt(0)}
          </div>
          <div>
            <p className="text-[13.5px] font-semibold">{application.name}</p>
            <span className="text-[11.5px] text-indigo-300">{application.town} · Runner</span>
          </div>
        </div>
      </aside>

      <main className="px-5 md:px-9 py-7">
        {view === "available" && (
          <>
            <PageHeader title="Available jobs" subtitle={`Jobs posted in ${application.town} — first accepted, first served.`} />
            {error && <div className="mb-4 px-4 py-3 rounded-xl bg-[#fdeaea] text-[#a83232] text-[13px]">{error}</div>}
            {townJobs.length === 0 ? (
              <EmptyState text="No jobs waiting in your town right now. Check back soon." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {townJobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-2xl border border-line p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-mono text-ink-soft">#{job.id} · {job.category}</span>
                      <span className="text-[15px] font-bold text-indigo-950">R{job.price}</span>
                    </div>
                    <h4 className="text-[14.5px] font-semibold mb-1.5">{job.title}</h4>
                    <p className="text-[12.5px] text-ink-soft mb-1">{job.location}</p>
                    <p className="text-[12px] text-ink-soft mb-4">Posted by {job.customerName} · Due {new Date(job.deadline).toLocaleDateString()}</p>
                    <Button size="md" block onClick={() => acceptJob(job)} disabled={accepting === job.id}>
                      {accepting === job.id ? "Accepting..." : "Accept job"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "myjobs" && (
          <>
            <PageHeader title="My jobs" subtitle="Jobs you've accepted, in progress, or completed." />
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              {myJobs.length === 0 ? (
                <EmptyState text="You haven't accepted any jobs yet." compact />
              ) : (
                myJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold">{job.title}</p>
                      <p className="text-[12px] text-ink-soft font-mono">#{job.id} · {job.customerName}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[14px] font-bold">R{job.price}</span>
                      <StatusPill status={job.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {view === "earnings" && (
          <>
            <PageHeader title="Earnings" subtitle="Your payout total after the platform fee." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[600px]">
              <div className="bg-indigo-950 text-white rounded-2xl p-5">
                <p className="text-[12px] text-white/60 mb-1">Total earned</p>
                <p className="text-[28px] font-bold">R{earnings.total.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-line p-5">
                <p className="text-[12px] text-ink-soft mb-1">Jobs completed</p>
                <p className="text-[28px] font-bold text-indigo-950">{earnings.jobCount}</p>
              </div>
            </div>
          </>
        )}

        {view === "profile" && (
          <>
            <PageHeader title="Profile" subtitle="Your verified details on file with Tuma Mina." />
            <div className="bg-white rounded-2xl border border-line p-5 max-w-[480px] flex flex-col gap-3.5">
              <DetailRow label="Full name" value={application.name} />
              <DetailRow label="Phone" value={application.phone} />
              <DetailRow label="Email" value={application.email} />
              <DetailRow label="Town" value={application.town} />
              <DetailRow label="Bank details" value={application.bankProof?.status === "verified" ? "Verified" : "Not verified"} />
              <DetailRow label="Proof of address" value={application.addressProof?.status === "verified" ? "Verified" : "Not verified"} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ApplicationPendingScreen({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-lavender-100 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-line p-8 max-w-[440px] text-center">
        <div className="w-14 h-14 rounded-full bg-lavender-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-indigo-600">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3.2 2" />
          </svg>
        </div>
        <h2 className="text-[20px] mb-2">Thanks, {name.split(" ")[0]} — you're in the queue</h2>
        <p className="text-[13.5px] text-ink-soft mb-5 leading-relaxed">
          Our admin team is reviewing your ID, bank details, and proof of address. This usually takes 1–2 business days. We'll notify you the moment you're approved to start accepting jobs.
        </p>
        <Link to="/"><Button variant="ghost">Back to home</Button></Link>
      </div>
    </div>
  );
}

function ApplicationRejectedScreen({ name, reason }: { name: string; reason?: string }) {
  return (
    <div className="min-h-screen bg-lavender-100 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-line p-8 max-w-[440px] text-center">
        <div className="w-14 h-14 rounded-full bg-[#fdeaea] flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-6 h-6 text-[#a83232]">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </div>
        <h2 className="text-[20px] mb-2">Application not approved</h2>
        <p className="text-[13.5px] text-ink-soft mb-5 leading-relaxed">
          {reason ?? "We couldn't verify all the details on your application."} You're welcome to reach out to support or reapply once you've addressed this.
        </p>
        <Link to="/"><Button variant="ghost">Back to home</Button></Link>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl sm:text-2xl">{title}</h1>
      <p className="text-ink-soft text-[13.5px] mt-1">{subtitle}</p>
    </div>
  );
}

function NavItem({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium mb-0.5 transition text-left w-full ${
        active ? "bg-coral text-white" : "text-indigo-100 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 && (
        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/25" : "bg-white/10"}`}>{count}</span>
      )}
    </button>
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

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return <p className={`text-[13.5px] text-ink-soft ${compact ? "p-6" : "py-12 text-center"}`}>{text}</p>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-ink-soft">{label}</span>
      <span className="text-[13.5px] font-medium">{value}</span>
    </div>
  );
}