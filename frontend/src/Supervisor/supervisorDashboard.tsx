import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import type { PlatformJob, RunnerProfile } from "../types/platform";

// TODO: replace with GET /api/supervisor/me — includes canViewFinancials from
// the SupervisorAccount record the admin created. This dashboard doesn't get
// its own signup; it's provisioned entirely by Admin > Supervisors.
const currentSupervisor = {
  name: "Naledi K.",
  town: "All towns" as const,
  canViewFinancials: true,
};

// TODO: replace with GET /api/supervisor/jobs
const jobs: PlatformJob[] = [
  { id: "TM-4821", title: "Collect a parcel from the courier depot", category: "Delivery", town: "Rustenburg", location: "Rustenburg CBD", customerName: "Kagiso T.", runnerName: "Thabo M.", status: "in_progress", price: 90, platformFee: 13.5, postedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(), deadline: new Date(Date.now() + 26 * 3_600_000).toISOString() },
  { id: "TM-4790", title: "Queue at Home Affairs for an ID renewal", category: "Queuing", town: "Rustenburg", location: "Home Affairs, Rustenburg", customerName: "Kagiso T.", status: "posted", price: 60, platformFee: 9, postedAt: new Date(Date.now() - 20 * 3_600_000).toISOString(), deadline: new Date(Date.now() + 3 * 24 * 3_600_000).toISOString() },
  { id: "TM-4756", title: "Grocery run for the week", category: "Shopping", town: "Johannesburg", location: "Waterfall Mall", customerName: "Palesa N.", runnerName: "Ayanda B.", status: "completed", price: 250, platformFee: 37.5, postedAt: new Date(Date.now() - 3 * 24 * 3_600_000).toISOString(), deadline: new Date(Date.now() - 2 * 24 * 3_600_000).toISOString() },
  { id: "TM-4703", title: "Fetch signed lease documents", category: "Document", town: "Pretoria", location: "Fourways", customerName: "Lindiwe D.", status: "disputed", price: 70, platformFee: 10.5, postedAt: new Date(Date.now() - 30 * 3_600_000).toISOString(), deadline: new Date(Date.now() - 5 * 3_600_000).toISOString() },
];

// TODO: replace with GET /api/supervisor/runners
const runners: RunnerProfile[] = [
  { id: "R-01", applicationId: "RA-1042", name: "Thabo Molefe", town: "Rustenburg", phone: "+27 82 555 0143", email: "thabo@example.com", rating: 4.9, completedJobs: 38, status: "active", joinedAt: new Date(Date.now() - 60 * 86_400_000).toISOString() },
  { id: "R-02", applicationId: "RA-1039", name: "Ayanda Bhengu", town: "Johannesburg", phone: "+27 81 222 9090", email: "ayanda@example.com", rating: 4.6, completedJobs: 21, status: "active", joinedAt: new Date(Date.now() - 40 * 86_400_000).toISOString() },
];

// TODO: replace with GET /api/supervisor/wallet-activity — only fetched/rendered
// at all if currentSupervisor.canViewFinancials is true.
interface MoneyEvent {
  id: string;
  jobId: string;
  type: "hold" | "release" | "refund";
  amount: number;
  at: string;
  note: string;
}
const moneyEvents: MoneyEvent[] = [
  { id: "m1", jobId: "TM-4821", type: "hold", amount: 90, at: new Date(Date.now() - 5 * 3_600_000).toISOString(), note: "Held from Kagiso T. on runner acceptance" },
  { id: "m2", jobId: "TM-4756", type: "release", amount: 250, at: new Date(Date.now() - 2 * 24 * 3_600_000 + 3_600_000).toISOString(), note: "Released to Ayanda B. on customer approval" },
  { id: "m3", jobId: "TM-4703", type: "refund", amount: 70, at: new Date(Date.now() - 4 * 3_600_000).toISOString(), note: "Refund pending — customer disputed job" },
];

type View = "jobs" | "runners" | "money";

export default function SupervisorDashboard() {
  const [view, setView] = useState<View>("jobs");
  const [search, setSearch] = useState("");

  const scopedJobs = useMemo(
    () => jobs.filter((j) => currentSupervisor.town === "All towns" || j.town === currentSupervisor.town),
    []
  );
  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedJobs;
    return scopedJobs.filter((j) => j.id.toLowerCase().includes(q) || (j.runnerName ?? "").toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q));
  }, [scopedJobs, search]);

  const activeCount = scopedJobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length;
  const exceptionsCount = scopedJobs.filter((j) => j.status === "disputed").length;
  const held = moneyEvents.filter((m) => m.type === "hold").reduce((s, m) => s + m.amount, 0)
    - moneyEvents.filter((m) => m.type === "release" || m.type === "refund").reduce((s, m) => s + m.amount, 0);
  const released = moneyEvents.filter((m) => m.type === "release").reduce((s, m) => s + m.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] min-h-screen bg-lavender-100">
      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mb-2.5 ml-2.5">Supervisor</div>
        <NavItem label="Jobs" active={view === "jobs"} onClick={() => setView("jobs")} badge={exceptionsCount} />
        <NavItem label="Runners" active={view === "runners"} onClick={() => setView("runners")} />
        {currentSupervisor.canViewFinancials && (
          <NavItem label="Money movement" active={view === "money"} onClick={() => setView("money")} />
        )}
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

      <main className="px-5 md:px-9 py-7">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-7">
          <div>
            <h1 className="text-2xl">Good morning, {currentSupervisor.name.split(" ")[0]}</h1>
            <p className="text-ink-soft text-[13.5px] mt-1">{activeCount} jobs moving right now · {currentSupervisor.town}</p>
          </div>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard label="Active jobs" value={String(activeCount)} />
          <StatCard label="Exceptions / disputes" value={String(exceptionsCount)} warn={exceptionsCount > 0} />
          <StatCard label="Active runners" value={String(runners.filter((r) => r.status === "active").length)} />
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