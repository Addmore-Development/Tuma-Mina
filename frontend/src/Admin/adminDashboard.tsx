import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";
import type { TownName } from "../types/platform";
import { TOWNS } from "../types/platform";
import {
  fetchPendingApplications,
  isApplicationComplete,
  approveApplication as apiApproveApplication,
  rejectApplication as apiRejectApplication,
  fetchAllRunners,
  toggleRunnerStatus as apiToggleRunnerStatus,
  fetchAllCustomers,
  addSupervisor as apiAddSupervisor,
  fetchAllSupervisors,
  toggleSupervisorStatus as apiToggleSupervisorStatus,
  toggleSupervisorFinance as apiToggleSupervisorFinance,
  fetchAllJobs,
  fetchFinanceSummary,
} from "../lib/supabase/admin";
import { subscribeToTables, unsubscribe } from "../lib/supabase/realtime";
import { getErrorMessage } from "../lib/getErrorMessage";

type View = "overview" | "jobs" | "applications" | "runners" | "customers" | "supervisors" | "finance";

// Row shapes as they come back from Supabase (joined) rather than the old
// hand-typed mock interfaces — kept loose (any-ish) since these are purely
// display rows built from live joins.
interface Row {
  [key: string]: any;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Row[]>([]);
  const [applications, setApplications] = useState<Row[]>([]);
  const [runners, setRunners] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [supervisors, setSupervisors] = useState<Row[]>([]);
  const [finance, setFinance] = useState({ totalHandled: 0, revenue: 0, completedCount: 0 });

  const [view, setView] = useState<View>("overview");
  const [jobTownFilter, setJobTownFilter] = useState<TownName | "all">("all");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [jobSearch, setJobSearch] = useState("");
  const [showAddSupervisor, setShowAddSupervisor] = useState(false);
  const [newSupervisorCreds, setNewSupervisorCreds] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadAll = useCallback(async () => {
    // Each fetch is named so that if one table/query fails (e.g. an RLS
    // policy denial or a missing trigger leaving a table empty), we can
    // report exactly which one broke instead of blanking the whole
    // dashboard and showing a single generic message.
    const results = await Promise.allSettled([
      fetchPendingApplications(),
      fetchAllRunners(),
      fetchAllCustomers(),
      fetchAllSupervisors(),
      fetchAllJobs(),
      fetchFinanceSummary(),
    ]);
    const labels = ["applications", "runners", "customers", "supervisors", "jobs", "finance summary"];

    const [appsR, rnsR, custsR, supsR, jbsR, finR] = results;

    if (appsR.status === "fulfilled") setApplications(appsR.value);
    if (rnsR.status === "fulfilled") setRunners(rnsR.value ?? []);
    if (custsR.status === "fulfilled") setCustomers(custsR.value ?? []);
    if (supsR.status === "fulfilled") setSupervisors(supsR.value ?? []);
    if (jbsR.status === "fulfilled") setJobs(jbsR.value ?? []);
    if (finR.status === "fulfilled") setFinance(finR.value);

    const failures = results
      .map((r, i) => (r.status === "rejected" ? { label: labels[i], reason: r.reason } : null))
      .filter((f): f is { label: string; reason: unknown } => f !== null);

    if (failures.length > 0) {
      const detail = failures
        .map((f) => `${f.label}: ${getErrorMessage(f.reason, "unknown error")}`)
        .join(" · ");
      setError(`Failed to load: ${detail}`);
    } else {
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    // Any change to any of these tables (a customer posting a task, a runner
    // signing up, a runner accepting a job, a supervisor being toggled, etc.)
    // re-pulls everything so this dashboard never goes stale.
    const channels = subscribeToTables(
      [
        { table: "tasks" },
        { table: "quotes" },
        { table: "runner_applications" },
        { table: "runner_profiles" },
        { table: "customer_profiles" },
        { table: "supervisor_profiles" },
        { table: "wallet_transactions" },
      ],
      loadAll
    );
    return () => {
      unsubscribe(channels);
    };
  }, [loadAll]);

  const pendingApplications = applications; // fetchPendingApplications already filters to pending
  const activeRunners = useMemo(() => runners.filter((r) => r.status === "active"), [runners]);
  const jobStatuses = useMemo(() => Array.from(new Set(jobs.map((j) => j.status))).sort(), [jobs]);
  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    return jobs.filter((j) => {
      if (jobTownFilter !== "all" && j.town !== jobTownFilter) return false;
      if (jobStatusFilter !== "all" && j.status !== jobStatusFilter) return false;
      if (q) {
        const haystack = [
          j.title,
          j.display_id,
          j.customer_profiles?.profiles?.name,
          j.customer_profiles?.profiles?.surname,
          j.runner_profiles?.profiles?.name,
          j.runner_profiles?.profiles?.surname,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, jobTownFilter, jobStatusFilter, jobSearch]);

  async function approveApplicationHandler(app: Row) {
    if (!isApplicationComplete(app)) return;
    try {
      await apiApproveApplication(app.id);
      await loadAll();
    } catch (e) {
      alert(getErrorMessage(e, "Could not approve this application."));
    }
  }

  async function rejectApplicationHandler(app: Row, reason: string) {
    try {
      await apiRejectApplication(app.id, reason);
      await loadAll();
    } catch (e) {
      alert(getErrorMessage(e, "Could not reject this application."));
    }
  }

  async function toggleRunnerStatusHandler(runner: Row) {
    try {
      await apiToggleRunnerStatus(runner.id, runner.status);
      await loadAll();
    } catch (e) {
      alert(getErrorMessage(e, "Could not update runner status."));
    }
  }

  async function addSupervisorHandler(name: string, surname: string, email: string, town: TownName | "All towns", canViewFinancials: boolean) {
    try {
      const result = await apiAddSupervisor({ name, surname, email, town, canViewFinancials });
      setShowAddSupervisor(false);
      setNewSupervisorCreds({ email: result.email, temporaryPassword: result.temporaryPassword });
      await loadAll();
    } catch (e) {
      alert(getErrorMessage(e, "Could not create supervisor account."));
    }
  }

  async function toggleSupervisorStatusHandler(sup: Row) {
    try {
      await apiToggleSupervisorStatus(sup.id, sup.status);
      await loadAll();
    } catch (e) {
      alert(getErrorMessage(e, "Could not update supervisor status."));
    }
  }

  async function toggleSupervisorFinanceHandler(sup: Row) {
    try {
      await apiToggleSupervisorFinance(sup.id, sup.can_view_financials);
      await loadAll();
    } catch (e) {
      alert(getErrorMessage(e, "Could not update financial access."));
    }
  }

  const navItems: { key: View; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "jobs", label: "All jobs" },
    { key: "applications", label: "Runner applications", badge: pendingApplications.length },
    { key: "runners", label: "Runners" },
    { key: "customers", label: "Customers" },
    { key: "supervisors", label: "Supervisors" },
    { key: "finance", label: "Finance" },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink-soft text-[14px]">Loading admin dashboard…</div>;
  }

  const navItemsList = (
    <>
      {navItems.map((n) => (
        <NavItem key={n.key} label={n.label} active={view === n.key} badge={n.badge} onClick={() => { setView(n.key); setMobileNavOpen(false); }} />
      ))}
    </>
  );

  return (
    <div className="md:grid md:grid-cols-[250px_1fr] min-h-screen bg-lavender-100">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-indigo-950 text-white px-4 py-3.5">
        <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="p-1 -ml-1 text-2xl leading-none">☰</button>
        <Logo light />
        <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300">Admin</span>
      </div>

      {/* Mobile off-canvas nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-indigo-950/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[270px] bg-indigo-950 text-white px-[18px] py-[22px] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <Logo light />
              <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-white/70">✕</button>
            </div>
            <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mb-2.5 ml-2.5">Admin</div>
            {navItemsList}
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5 mt-2">
              Log out
            </Link>
            <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
              <div className="w-[26px] h-[26px] rounded-full bg-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-[13.5px] font-semibold">Admin</p>
                <span className="text-[11.5px] text-indigo-300">Full access</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mb-2.5 ml-2.5">Admin</div>
        {navItemsList}
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5 mt-2">
          Log out
        </Link>
        <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-full bg-indigo-400 flex-shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold">Admin</p>
            <span className="text-[11.5px] text-indigo-300">Full access</span>
          </div>
        </div>
      </aside>

      <main className="px-4 sm:px-5 md:px-9 py-6 md:py-7">
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-[#fdeaea] text-[#a83232] text-[13px] flex items-center justify-between gap-3">
            {error}
            <button onClick={loadAll} className="underline font-semibold flex-shrink-0">Retry</button>
          </div>
        )}

        {view === "overview" && (
          <>
            <PageHeader title="Admin overview" subtitle="Platform-wide status across every town — updates live." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
              <StatCard label="Jobs on platform" value={String(jobs.length)} />
              <StatCard label="Active runners" value={String(activeRunners.length)} />
              <StatCard label="Customers" value={String(customers.length)} />
              <StatCard label="Pending applications" value={String(pendingApplications.length)} warn={pendingApplications.length > 0} />
            </div>
            {pendingApplications.length > 0 && (
              <div className="bg-white rounded-2xl border border-line p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px]">Applications waiting on you</h3>
                  <button onClick={() => setView("applications")} className="text-[13px] text-indigo-600 font-semibold">Review all →</button>
                </div>
                {pendingApplications.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-b-0">
                    <div>
                      <p className="text-[13.5px] font-medium">{a.profiles?.name} {a.profiles?.surname}</p>
                      <p className="text-[12px] text-ink-soft">{a.town}{!isApplicationComplete(a) && " · Missing documents"}</p>
                    </div>
                    <Button size="md" onClick={() => setView("applications")}>Review</Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "jobs" && (
          <>
            <PageHeader title="All jobs" subtitle="Every job posted on the platform, across all towns — who posted it and who took it." />
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex gap-2 flex-wrap items-center">
                <label className="text-[12px] text-ink-soft font-semibold" htmlFor="job-town-filter">Town</label>
                <select
                  id="job-town-filter"
                  value={jobTownFilter}
                  onChange={(e) => setJobTownFilter(e.target.value as TownName | "all")}
                  className="px-3.5 py-2 border-[1.5px] border-line rounded-xl text-[13px] bg-white focus:outline-none focus:border-indigo-500 w-full sm:w-[220px]"
                >
                  <option value="all">All towns</option>
                  {TOWNS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 flex-wrap items-center">
                <select
                  value={jobStatusFilter}
                  onChange={(e) => setJobStatusFilter(e.target.value)}
                  className="px-3.5 py-2 border-[1.5px] border-line rounded-xl text-[13px] bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All statuses</option>
                  {jobStatuses.map((s) => (
                    <option key={s} value={s}>{formatStatusLabel(s)}</option>
                  ))}
                </select>
                <input
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder="Search by job, customer, or runner…"
                  className="px-3.5 py-2 border-[1.5px] border-line rounded-xl text-[13px] flex-1 min-w-[220px] focus:outline-none focus:border-indigo-500"
                />
                {(jobTownFilter !== "all" || jobStatusFilter !== "all" || jobSearch) && (
                  <button
                    onClick={() => {
                      setJobTownFilter("all");
                      setJobStatusFilter("all");
                      setJobSearch("");
                    }}
                    className="text-[12.5px] text-ink-soft hover:text-indigo-600 font-medium"
                  >
                    Clear filters
                  </button>
                )}
                <span className="text-[12.5px] text-ink-soft ml-auto">{filteredJobs.length} of {jobs.length} jobs</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden overflow-x-auto">
              <table className="w-full border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-paper">
                    {["Job", "Town", "Customer", "Runner", "Status", "Price", "Fee"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wide text-ink-soft font-semibold border-b border-line">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-ink-soft">No jobs match these filters.</td>
                    </tr>
                  ) : (
                    filteredJobs.map((j) => (
                      <tr key={j.id}>
                        <td className="px-4 py-3 text-[13px] border-b border-line">
                          <span className="font-mono text-[11px] text-ink-soft block">#{j.display_id}</span>
                          {j.title}
                        </td>
                        <td className="px-4 py-3 text-[13px] border-b border-line">{j.town}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-line">{j.customer_profiles?.profiles?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-[13px] border-b border-line">{j.runner_profiles?.profiles?.name ?? "Unassigned"}</td>
                        <td className="px-4 py-3 border-b border-line"><JobStatusPill status={j.status} /></td>
                        <td className="px-4 py-3 text-[13px] font-semibold border-b border-line">R{j.price ?? j.budget ?? 0}</td>
                        <td className="px-4 py-3 text-[13px] text-ink-soft border-b border-line">{j.platform_fee ? `R${Number(j.platform_fee).toFixed(2)}` : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === "applications" && (
          <>
            <PageHeader title="Runner applications" subtitle="Review ID, headshot, bank and address proof before approving a runner." />
            <div className="flex flex-col gap-3">
              {applications.length === 0 ? (
                <p className="text-[13.5px] text-ink-soft py-8 text-center">No pending applications.</p>
              ) : (
                applications.map((a) => (
                  <ApplicationRow
                    key={a.id}
                    application={a}
                    onApprove={() => approveApplicationHandler(a)}
                    onReject={(reason) => rejectApplicationHandler(a, reason)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {view === "runners" && (
          <>
            <PageHeader title="Runners" subtitle="Everyone currently approved to accept jobs." />
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              {runners.length === 0 && <p className="p-6 text-[13.5px] text-ink-soft">No approved runners yet.</p>}
              {runners.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 flex-wrap">
                  <div>
                    <p className="text-[13.5px] font-semibold">{r.profiles?.name} {r.profiles?.surname}</p>
                    <p className="text-[12px] text-ink-soft">{r.town} · {r.completed_jobs} jobs · ★ {Number(r.rating).toFixed(1)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full ${r.status === "active" ? "bg-[#e9faf1] text-[#1f9d5c]" : "bg-[#f1f1f5] text-ink-soft"}`}>
                      {r.status === "active" ? "Active" : "Suspended"}
                    </span>
                    <Button size="md" variant="ghost" onClick={() => toggleRunnerStatusHandler(r)}>
                      {r.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "customers" && (
          <>
            <PageHeader title="Customers" subtitle="Everyone signed up as a customer, and their wallet balance." />
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              {customers.length === 0 && <p className="p-6 text-[13.5px] text-ink-soft">No customers yet.</p>}
              {customers.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 flex-wrap">
                  <div>
                    <p className="text-[13.5px] font-semibold">{c.profiles?.name} {c.profiles?.surname}</p>
                    <p className="text-[12px] text-ink-soft">{c.profiles?.email} · {c.profiles?.phone}</p>
                  </div>
                  <span className="text-[13px] font-semibold">R{Number(c.wallets?.[0]?.balance ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "supervisors" && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl">Supervisors</h1>
                <p className="text-ink-soft text-[13.5px] mt-1">Supervisors see all jobs and runners. Toggle whether each one can also see money movement.</p>
              </div>
              <Button onClick={() => setShowAddSupervisor(true)}>+ Add supervisor</Button>
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              {supervisors.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 flex-wrap">
                  <div>
                    <p className="text-[13.5px] font-semibold">{s.profiles?.name} {s.profiles?.surname}</p>
                    <p className="text-[12px] text-ink-soft">{s.profiles?.email} · {s.town ?? "All towns"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSupervisorFinanceHandler(s)}
                      className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full transition ${
                        s.can_view_financials ? "bg-lavender-100 text-indigo-600" : "bg-[#f1f1f5] text-ink-soft"
                      }`}
                    >
                      {s.can_view_financials ? "Can view financials" : "No financial access"}
                    </button>
                    <span className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full ${s.status === "active" ? "bg-[#e9faf1] text-[#1f9d5c]" : "bg-[#f1f1f5] text-ink-soft"}`}>
                      {s.status === "active" ? "Active" : "Suspended"}
                    </span>
                    <Button size="md" variant="ghost" onClick={() => toggleSupervisorStatusHandler(s)}>
                      {s.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {showAddSupervisor && <AddSupervisorModal onClose={() => setShowAddSupervisor(false)} onCreate={addSupervisorHandler} />}
            {newSupervisorCreds && (
              <SupervisorCredentialsModal
                email={newSupervisorCreds.email}
                temporaryPassword={newSupervisorCreds.temporaryPassword}
                onClose={() => setNewSupervisorCreds(null)}
              />
            )}
          </>
        )}

        {view === "finance" && (
          <>
            <PageHeader title="Finance" subtitle="Admin-only view of platform revenue and job values." />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 max-w-[800px]">
              <StatCard label="Total handled (completed jobs)" value={`R${finance.totalHandled.toFixed(2)}`} />
              <StatCard label="Platform fees earned" value={`R${finance.revenue.toFixed(2)}`} />
              <StatCard label="Completed jobs" value={String(finance.completedCount)} />
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden max-w-[800px]">
              <div className="px-5 py-3.5 border-b border-line"><h3 className="text-[14px] font-semibold">Completed job payouts</h3></div>
              {jobs.filter((j) => j.status === "completed").map((j) => (
                <div key={j.id} className="flex items-center justify-between px-5 py-3.5 border-b border-line last:border-b-0 text-[13px]">
                  <span>#{j.display_id} · {j.title}</span>
                  <span>
                    <span className="font-semibold">R{j.price}</span>{" "}
                    <span className="text-ink-soft">(fee R{Number(j.platform_fee ?? 0).toFixed(2)})</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function DocRow({ label, path, url }: { label: string; path: string | null; url?: string | null }) {
  const submitted = Boolean(path);
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-[1.5px] border-line rounded-lg">
      <div>
        <p className="text-[12px] text-ink-soft">{label}</p>
        <p className={`text-[13px] font-medium ${!submitted ? "text-[#a83232]" : ""}`}>
          {submitted ? "Submitted" : "Not submitted"}
        </p>
      </div>
      {submitted && (
        url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12.5px] font-semibold text-indigo-600 hover:underline flex-shrink-0"
          >
            View
          </a>
        ) : (
          // Signed URL wasn't generated (e.g. createSignedUrl failed for this
          // file) — surface that instead of a silently missing link.
          <span className="text-[11.5px] text-ink-soft flex-shrink-0">Link unavailable</span>
        )
      )}
    </div>
  );
}

function ApplicationRow({ application, onApprove, onReject }: { application: Row; onApprove: () => void; onReject: (reason: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const complete = isApplicationComplete(application as Parameters<typeof isApplicationComplete>[0]);
  return (
    <div className="bg-white rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-[14.5px] font-semibold">{application.profiles?.name} {application.profiles?.surname}</p>
          <p className="text-[12.5px] text-ink-soft">{application.town} · Applied {new Date(application.applied_at).toLocaleDateString()}</p>
        </div>
        {!rejecting && (
          <div className="flex gap-2">
            <Button size="md" variant="ghost" onClick={() => setRejecting(true)} className="!text-[#a83232] hover:!border-[#a83232]">Reject</Button>
            <Button size="md" onClick={onApprove} disabled={!complete} className={!complete ? "opacity-50 pointer-events-none" : ""}>
              Approve
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12.5px] mb-3.5">
        <DetailRow label="ID number" value={application.id_number} />
        <DetailRow label="Address" value={application.address} />
        <DetailRow label="Phone" value={application.profiles?.phone} />
        <DetailRow label="Email" value={application.profiles?.email} />
      </div>

      <p className="text-[11.5px] uppercase tracking-wide text-ink-soft mb-2">Verification documents</p>
      <div className="grid grid-cols-2 gap-2.5">
        <DocRow label="Headshot" path={application.headshot_path} url={application.headshot_url} />
        <DocRow label="ID document" path={application.id_document_path} url={application.id_document_url} />
        <DocRow label="Proof of bank account" path={application.bank_proof_path} url={application.bank_proof_url} />
        <DocRow label="Proof of address" path={application.address_proof_path} url={application.address_proof_url} />
      </div>
      {!complete && (
        <p className="text-[12px] text-[#a83232] mt-2.5">Missing documents — approval is disabled until all four are submitted.</p>
      )}

      {rejecting && (
        <div className="mt-3.5 flex items-center gap-2.5 flex-wrap">
          <input
            type="text"
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection"
            className="flex-1 min-w-[200px] px-3.5 py-2.5 border-[1.5px] border-line rounded-lg text-[13px] focus:outline-none focus:border-indigo-500"
          />
          <Button size="md" onClick={() => reason.trim() && onReject(reason.trim())}>Confirm reject</Button>
          <Button size="md" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

function AddSupervisorModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, surname: string, email: string, town: TownName | "All towns", canViewFinancials: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [town, setTown] = useState<TownName | "All towns">("All towns");
  const [canViewFinancials, setCanViewFinancials] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] mb-4">Add a supervisor</h3>
        <div className="flex flex-col gap-3.5 mb-5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className="px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14px] focus:outline-none focus:border-indigo-500" />
          <input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Surname" className="px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14px] focus:outline-none focus:border-indigo-500" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14px] focus:outline-none focus:border-indigo-500" />
          <select value={town} onChange={(e) => setTown(e.target.value as TownName | "All towns")} className="px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14px] focus:outline-none focus:border-indigo-500">
            <option>All towns</option>
            {TOWNS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2.5 text-[13px] text-ink-soft">
            <input type="checkbox" checked={canViewFinancials} onChange={(e) => setCanViewFinancials(e.target.checked)} />
            Allow this supervisor to see money movement (escrow, releases, revenue)
          </label>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" block onClick={onClose}>Cancel</Button>
          <Button
            block
            disabled={!name.trim() || !surname.trim() || !email.trim() || submitting}
            onClick={async () => {
              setSubmitting(true);
              await onCreate(name.trim(), surname.trim(), email.trim(), town, canViewFinancials);
              setSubmitting(false);
            }}
          >
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SupervisorCredentialsModal({
  email,
  temporaryPassword,
  onClose,
}: {
  email: string;
  temporaryPassword: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCreds() {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nTemporary password: ${temporaryPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, non-HTTPS context) —
      // the credentials are still shown on screen either way.
    }
  }

  return (
    <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] mb-1.5">Supervisor account created</h3>
        <p className="text-[13px] text-ink-soft mb-5 leading-relaxed">
          Share these details with them directly — this password won't be shown again. They should change it after their first login.
        </p>
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft mb-1">Email</p>
            <p className="text-[14px] font-medium font-mono">{email}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft mb-1">Temporary password</p>
            <p className="text-[16px] font-bold font-mono tracking-wide">{temporaryPassword}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" block onClick={copyCreds}>{copied ? "Copied ✓" : "Copy details"}</Button>
          <Button block onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl sm:text-2xl">{title}</h1>
      <p className="text-ink-soft text-[13.5px] mt-1">{subtitle}</p>
    </div>
  );
}

function NavItem({ label, active, badge, onClick }: { label: string; active: boolean; badge?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium mb-0.5 transition text-left w-full ${
        active ? "bg-coral text-white" : "text-indigo-100 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
      {!!badge && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/25" : "bg-white/10"}`}>{badge}</span>}
    </button>
  );
}

function StatCard({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border ${warn ? "border-[#f3c5c5]" : "border-line"}`}>
      <span className="text-[11px] sm:text-xs font-semibold text-ink-soft block mb-2">{label}</span>
      <h3 className="text-[22px] sm:text-[27px]">{value}</h3>
    </div>
  );
}

function JobStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    posted: { label: "Posted", classes: "bg-lavender-100 text-indigo-600" },
    accepted: { label: "Accepted", classes: "bg-[#fff2ea] text-coral-dark" },
    in_progress: { label: "In progress", classes: "bg-[#fff2ea] text-coral-dark" },
    awaiting_confirmation: { label: "Awaiting confirmation", classes: "bg-lavender-100 text-indigo-600" },
    completed: { label: "Completed", classes: "bg-[#e9faf1] text-[#1f9d5c]" },
    disputed: { label: "Disputed", classes: "bg-[#fdeaea] text-[#d64545]" },
    cancelled: { label: "Cancelled", classes: "bg-[#f1f1f5] text-ink-soft" },
  };
  const c = map[status] ?? map.posted;
  return <span className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full whitespace-nowrap ${c.classes}`}>{c.label}</span>;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-ink-soft text-[11px]">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}