import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { TOWNS, type PlatformJob, type RunnerProfile } from "../types/platform";
import {
  fetchMySupervisorProfile,
  fetchScopedJobs,
  fetchScopedRunners,
  fetchScopedCustomers,
  fetchMoneyMovement,
  type MoneyEvent,
} from "../lib/supabase/supervisor";
import { subscribeToTables, unsubscribe } from "../lib/supabase/realtime";
import { getErrorMessage } from "../lib/getErrorMessage";
import ToastStack, { type ToastMessage } from "../Customer/components/Toast";

type View = "jobs" | "runners" | "customers" | "money";

// Loose row shape for customer_profiles as it comes back from the join —
// same pattern as adminDashboard.tsx's local Row type.
interface CustomerRow {
  [key: string]: any;
}

export default function SupervisorDashboard() {
  const [view, setView] = useState<View>("jobs");
  const [search, setSearch] = useState("");
  // Only meaningful for "All towns" supervisors — town-scoped supervisors
  // are always locked to their own town and never see this control.
  const [townFilter, setTownFilter] = useState<string>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSupervisor, setCurrentSupervisor] = useState<{ name: string; town: string | "All towns"; canViewFinancials: boolean } | null>(null);
  const [jobs, setJobs] = useState<PlatformJob[]>([]);
  const [runners, setRunners] = useState<RunnerProfile[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [moneyEvents, setMoneyEvents] = useState<MoneyEvent[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const sup = await fetchMySupervisorProfile();
      setCurrentSupervisor(sup);
      // "All towns" supervisors can narrow to a single town via the filter
      // dropdown below; town-scoped supervisors are always locked to sup.town.
      const town = sup.town === "All towns" ? (townFilter === "all" ? null : townFilter) : sup.town;

      const [jbs, rns, custs] = await Promise.all([
        fetchScopedJobs(town),
        fetchScopedRunners(town),
        fetchScopedCustomers(),
      ]);
      setJobs(jbs);
      setRunners(rns);
      setCustomers(custs ?? []);

      if (sup.canViewFinancials) {
        setMoneyEvents(await fetchMoneyMovement());
      }
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load supervisor data."));
    } finally {
      setLoading(false);
    }
  }, [townFilter]);

  useEffect(() => {
    loadAll();
    const channels = subscribeToTables(
      [
        { table: "tasks" },
        { table: "runner_profiles" },
        { table: "customer_profiles" },
        { table: "wallet_transactions" },
      ],
      loadAll
    );
    return () => {
      unsubscribe(channels);
    };
  }, [loadAll]);

  // Separate, narrower subscription just for newly posted jobs, so the
  // supervisor gets an explicit notification rather than only a silent
  // table refresh. Scoped to the supervisor's town once known; "All towns"
  // supervisors get every posted job.
  useEffect(() => {
    if (!currentSupervisor) return;
    const town =
      currentSupervisor.town === "All towns"
        ? (townFilter === "all" ? null : townFilter)
        : currentSupervisor.town;
    const channels = subscribeToTables(
      [
        {
          table: "tasks",
          event: "INSERT",
          filter: town ? `town=eq.${town}` : undefined,
        },
      ],
      (payload) => {
        const job = payload?.new;
        if (!job || job.status !== "posted") return;
        setToasts((t) => [
          ...t,
          {
            id: `${job.id}-${Date.now()}`,
            tone: "info",
            text: `New job posted: ${job.title} (#${job.display_id}) · ${job.town}`,
          },
        ]);
      }
    );
    return () => {
      unsubscribe(channels);
    };
  }, [currentSupervisor?.town, townFilter]);

  const scopedJobs = jobs; // already town-scoped server-side by fetchScopedJobs
  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedJobs;
    return scopedJobs.filter((j) => j.id.toLowerCase().includes(q) || (j.runnerName ?? "").toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q));
  }, [scopedJobs, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-lavender-100 flex items-center justify-center">
        <p className="text-[13.5px] text-ink-soft">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !currentSupervisor) {
    return (
      <div className="min-h-screen bg-lavender-100 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-line p-8 max-w-[440px] text-center">
          <h2 className="text-[20px] mb-2">Couldn't load supervisor data</h2>
          <p className="text-[13.5px] text-ink-soft">{error ?? "No supervisor profile found for this account."}</p>
        </div>
      </div>
    );
  }

  const activeCount = scopedJobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;
  const exceptionsCount = scopedJobs.filter((j) => j.status === "disputed").length;
  const held = moneyEvents.filter((m) => m.type === "hold").reduce((s, m) => s + m.amount, 0)
    - moneyEvents.filter((m) => m.type === "release" || m.type === "refund").reduce((s, m) => s + m.amount, 0);
  const released = moneyEvents.filter((m) => m.type === "release").reduce((s, m) => s + m.amount, 0);

  const navItemsList = (
    <>
      <NavItem label="Jobs" active={view === "jobs"} onClick={() => { setView("jobs"); setMobileNavOpen(false); }} badge={exceptionsCount} />
      <NavItem label="Runners" active={view === "runners"} onClick={() => { setView("runners"); setMobileNavOpen(false); }} />
      <NavItem label="Customers" active={view === "customers"} onClick={() => { setView("customers"); setMobileNavOpen(false); }} />
      {currentSupervisor.canViewFinancials && (
        <NavItem label="Money movement" active={view === "money"} onClick={() => { setView("money"); setMobileNavOpen(false); }} />
      )}
    </>
  );

  return (
    <div className="md:grid md:grid-cols-[250px_1fr] min-h-screen bg-lavender-100">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-indigo-950 text-white px-4 py-3.5">
        <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="p-1 -ml-1 text-2xl leading-none">☰</button>
        <Logo light />
        <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300">Supervisor</span>
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
            <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mb-2.5 ml-2.5">Supervisor</div>
            {navItemsList}
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5 mt-2">
              Log out
            </Link>
            <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
              <div className="w-[26px] h-[26px] rounded-full bg-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-[13.5px] font-semibold">{currentSupervisor.name}</p>
                <span className="text-[11.5px] text-indigo-300">{currentSupervisor.town} · Supervisor</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mb-2.5 ml-2.5">Supervisor</div>
        {navItemsList}
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5 mt-2">
          Log out
        </Link>
        <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-full bg-indigo-400 flex-shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold">{currentSupervisor.name}</p>
            <span className="text-[11.5px] text-indigo-300">{currentSupervisor.town} · Supervisor</span>
          </div>
        </div>
      </aside>

      <main className="px-4 sm:px-5 md:px-9 py-6 md:py-7">
        <div className="flex justify-between items-start md:items-center flex-wrap gap-4 mb-6 md:mb-7">
          <div>
            <h1 className="text-xl sm:text-2xl">Good morning, {currentSupervisor.name.split(" ")[0]}</h1>
            <p className="text-ink-soft text-[13.5px] mt-1">
              {activeCount} jobs moving right now · {currentSupervisor.town === "All towns" && townFilter !== "all" ? townFilter : currentSupervisor.town}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {currentSupervisor.town === "All towns" && (
              <select
                value={townFilter}
                onChange={(e) => setTownFilter(e.target.value)}
                className="bg-white border-[1.5px] border-line rounded-xl px-4 py-2.5 text-[13.5px] w-full sm:w-[190px] focus:outline-none focus:border-indigo-500"
                aria-label="Filter by town"
              >
                <option value="all">All towns</option>
                {TOWNS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2.5 bg-white border-[1.5px] border-line rounded-xl px-4 py-2.5 w-full md:w-[280px]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4 text-ink-soft flex-shrink-0">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job ID, runner or client..."
                className="border-none outline-none text-[13.5px] w-full"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard label="Active jobs" value={String(activeCount)} />
          <StatCard label="Exceptions / disputes" value={String(exceptionsCount)} warn={exceptionsCount > 0} />
          <StatCard label="Active runners" value={String(runners.filter((r) => r.status === "active").length)} />
          <StatCard label="Customers" value={String(customers.length)} />
          {currentSupervisor.canViewFinancials ? (
            <StatCard label="Currently in escrow" value={`R${held.toFixed(2)}`} />
          ) : (
            <StatCard label="Money movement" value="Not visible" muted />
          )}
        </div>

        {view === "jobs" && (
          <div className="bg-white rounded-2xl border border-line overflow-hidden overflow-x-auto">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="text-[15.5px]">Jobs — status &amp; execution</h3>
            </div>
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-paper">
                  {["Job", "Customer", "Runner", "Status", "Price"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[11px] uppercase tracking-wide text-ink-soft font-semibold border-b border-line">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="px-5 py-3.5 text-[13.5px] border-b border-line">
                      <span className="font-mono text-[11px] text-ink-soft block">#{j.id}</span>
                      {j.title}
                    </td>
                    <td className="px-5 py-3.5 text-[13.5px] border-b border-line">{j.customerName}</td>
                    <td className="px-5 py-3.5 text-[13.5px] border-b border-line">{j.runnerName ?? "Unassigned"}</td>
                    <td className="px-5 py-3.5 border-b border-line"><JobStatusPill status={j.status} /></td>
                    <td className="px-5 py-3.5 text-[13.5px] font-semibold border-b border-line">R{j.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "runners" && (
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="text-[15.5px]">Runners</h3>
            </div>
            {runners.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 flex-wrap">
                <div>
                  <p className="text-[13.5px] font-semibold">{r.name}</p>
                  <p className="text-[12px] text-ink-soft">{r.town} · {r.completedJobs} jobs completed · ★ {r.rating.toFixed(1)}</p>
                </div>
                <span className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full ${r.status === "active" ? "bg-[#e9faf1] text-[#1f9d5c]" : "bg-[#f1f1f5] text-ink-soft"}`}>
                  {r.status === "active" ? "Active" : "Suspended"}
                </span>
              </div>
            ))}
            <p className="px-5 py-3 text-[12px] text-ink-soft">Suspending or approving runners is an Admin action — contact admin if a runner needs action.</p>
          </div>
        )}

        {view === "customers" && (
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="text-[15.5px]">Customers</h3>
              <p className="text-[12px] text-ink-soft mt-0.5">Everyone signed up as a customer, and their wallet balance.</p>
            </div>
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
        )}

        {view === "money" && currentSupervisor.canViewFinancials && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-[600px]">
              <div className="bg-indigo-950 text-white rounded-2xl p-5">
                <p className="text-[12px] text-white/60 mb-1">Currently held in escrow</p>
                <p className="text-[26px] font-bold">R{held.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-line p-5">
                <p className="text-[12px] text-ink-soft mb-1">Released to runners (all time)</p>
                <p className="text-[26px] font-bold text-[#1f9d5c]">R{released.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden max-w-[800px]">
              <div className="px-5 py-4 border-b border-line"><h3 className="text-[15.5px]">Money movement</h3></div>
              {moneyEvents.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line last:border-b-0 text-[13px]">
                  <div>
                    <p className="font-medium">{m.note}</p>
                    <p className="text-[11.5px] text-ink-soft font-mono">#{m.jobId} · {new Date(m.at).toLocaleString()}</p>
                  </div>
                  <span className={`font-bold ${m.type === "hold" ? "text-ink" : m.type === "release" ? "text-[#1f9d5c]" : "text-[#a83232]"}`}>
                    {m.type === "hold" ? "Held" : m.type === "release" ? "+" : "↩"} R{m.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function NavItem({ label, active = false, onClick, badge }: { label: string; active?: boolean; onClick?: () => void; badge?: number }) {
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

function StatCard({ label, value, warn = false, muted = false }: { label: string; value: string; warn?: boolean; muted?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border ${warn ? "border-[#f3c5c5]" : "border-line"}`}>
      <span className="text-[11px] sm:text-xs font-semibold text-ink-soft block mb-2">{label}</span>
      <h3 className={`text-[22px] sm:text-[27px] ${muted ? "text-ink-soft italic text-[15px]" : ""}`}>{value}</h3>
    </div>
  );
}

function JobStatusPill({ status }: { status: PlatformJob["status"] }) {
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