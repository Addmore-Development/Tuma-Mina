import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import Logo from "../components/Logo";
import StatusBadge from "../components/StatusBadge";
import type { Job, Exception, RunnerPin } from "../types";

const jobs: Job[] = [
  { id: "TM-2291", route: "Sandton → Rosebank", runnerName: "Thabo M.", runnerColor: "#ff7a59", type: "Delivery", status: "en_route", eta: "6 min" },
  { id: "TM-2288", route: "Home Affairs, Randburg", runnerName: "Palesa N.", runnerColor: "#4b4fe0", type: "Queuing", status: "in_queue", eta: "1h 40m" },
  { id: "TM-2285", route: "Doc pickup, Midrand", runnerName: "Sipho R.", runnerColor: "#2fbf71", type: "Document", status: "awaiting_pin", eta: "—" },
  { id: "TM-2279", route: "Groceries, Fourways", runnerName: "Ayanda B.", runnerColor: "#9296f5", type: "Shopping", status: "flagged", eta: "Overdue" },
  { id: "TM-2274", route: "Furniture move, Bryanston", runnerName: "Kagiso T.", runnerColor: "#e85f3d", type: "Errand", status: "delivered", eta: "Done" },
];

const exceptions: Exception[] = [
  { id: "e1", jobId: "TM-2279", runnerName: "Ayanda B.", location: "Fourways", headline: "No movement for 40 min" },
  { id: "e2", jobId: "TM-2261", runnerName: "Kagiso T.", location: "Bryanston", headline: "Client disputes proof photo" },
  { id: "e3", jobId: "TM-2288", runnerName: "Palesa N.", location: "Randburg", headline: "Runner requests price renegotiation" },
];

const runnerPins: RunnerPin[] = [
  { name: "Thabo", color: "#ff7a59", x: 20, y: 30 },
  { name: "Palesa", color: "#4b4fe0", x: 55, y: 55 },
  { name: "Sipho", color: "#2fbf71", x: 75, y: 25 },
  { name: "Ayanda", color: "#e85f3d", x: 38, y: 75 },
];

const slaTrend = [
  { day: "Mon", sla: 88 },
  { day: "Tue", sla: 90 },
  { day: "Wed", sla: 86 },
  { day: "Thu", sla: 91 },
  { day: "Fri", sla: 89 },
  { day: "Sat", sla: 94 },
  { day: "Sun", sla: 92 },
];

const columnHelper = createColumnHelper<Job>();

const columns = [
  columnHelper.accessor("id", {
    header: "Job",
    cell: (info) => (
      <div>
        <span className="font-mono text-xs text-ink-soft">#{info.getValue()}</span>
        <br />
        {info.row.original.route}
      </div>
    ),
  }),
  columnHelper.accessor("runnerName", {
    header: "Runner",
    cell: (info) => (
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: info.row.original.runnerColor }} />
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor("type", { header: "Type" }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("eta", {
    header: "ETA",
    cell: (info) => <span className="font-mono">{info.getValue()}</span>,
  }),
];

function StatCard({
  label,
  value,
  trend,
  trendTone,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  trend: string;
  trendTone: "up" | "warn" | "neutral";
  iconBg: string;
  icon: React.ReactNode;
}) {
  const toneClass =
    trendTone === "up" ? "text-brand-green" : trendTone === "warn" ? "text-coral-dark" : "text-ink-soft";
  return (
    <div className="bg-white rounded-2xl p-5 border border-line">
      <div className="flex justify-between items-start mb-3.5">
        <span className="text-xs font-semibold text-ink-soft">{label}</span>
        <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <h3 className="text-[27px] mb-1.5">{value}</h3>
      <span className={`text-xs font-semibold ${toneClass}`}>{trend}</span>
    </div>
  );
}

export default function SupervisorDashboard() {
  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const activeCount = useMemo(() => jobs.filter((j) => j.status !== "delivered").length, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] min-h-screen bg-lavender-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />

        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mt-4 mb-2.5 ml-2.5">
          Operations
        </div>
        <NavItem active label="Overview" />
        <NavItem label="Active jobs" />
        <NavItem label="Exceptions" />
        <NavItem label="Runners" />
        <NavItem label="Reports" />

        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mt-4 mb-2.5 ml-2.5">
          Account
        </div>
        <NavItem label="Settings" />
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5">
          Log out
        </Link>

        <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-full bg-indigo-400 flex-shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold">Naledi K.</p>
            <span className="text-[11.5px] text-indigo-300">Supervisor</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="px-6 md:px-9 py-7">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-7">
          <div>
            <h1 className="text-2xl">Good morning, Naledi</h1>
            <p className="text-ink-soft text-[13.5px] mt-1">
              Tuesday, 12 August · {activeCount} jobs moving right now across Gauteng
            </p>
          </div>
          <div className="flex items-center gap-2.5 bg-white border-[1.5px] border-line rounded-xl px-4 py-2.5 w-full md:w-[280px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4 text-ink-soft flex-shrink-0">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
            <input type="text" placeholder="Search job ID, runner or client..." className="border-none outline-none text-[13.5px] w-full" />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Active jobs"
            value="14"
            trend="↑ 3 since 9am"
            trendTone="up"
            iconBg="#eeeefc"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#4b4fe0" strokeWidth="2.2" className="w-[17px] h-[17px]"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg>}
          />
          <StatCard
            label="SLA on track"
            value="92%"
            trend="↑ 4% vs last week"
            trendTone="up"
            iconBg="#e9faf1"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#2fbf71" strokeWidth="2.2" className="w-[17px] h-[17px]"><path d="M20 6L9 17l-5-5" /></svg>}
          />
          <StatCard
            label="Exceptions"
            value="3"
            trend="Needs review"
            trendTone="warn"
            iconBg="#fdeaea"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#d64545" strokeWidth="2.2" className="w-[17px] h-[17px]"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>}
          />
          <StatCard
            label="Awaiting auto-release"
            value="6"
            trend="Within 72hr window"
            trendTone="neutral"
            iconBg="#fff2ea"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#ff7a59" strokeWidth="2.2" className="w-[17px] h-[17px]"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          {/* Jobs table + SLA trend */}
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-line">
                <h3 className="text-[15.5px]">Jobs in progress</h3>
                <a href="#" className="text-[13px] text-indigo-600 font-semibold">View all →</a>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th key={header.id} className="text-left px-5 py-2.5 text-[11px] uppercase tracking-wide text-ink-soft font-semibold bg-paper border-b border-line">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3.5 text-[13.5px] border-b border-line last:border-b-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-2xl border border-line p-5">
              <h3 className="text-[15.5px] mb-4">SLA compliance — last 7 days</h3>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={slaTrend}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5a5d84" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sla" stroke="#4b4fe0" strokeWidth={2} fill="#4b4fe0" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Map + exceptions */}
          <div className="flex flex-col gap-5">
            <div className="bg-indigo-950 rounded-2xl overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-white/10">
                <h3 className="text-[15.5px] text-white">Live runner map</h3>
                <a href="#" className="text-[13px] text-indigo-400">Expand →</a>
              </div>
              <div className="relative h-[180px]">
                {runnerPins.map((p) => (
                  <div key={p.name} className="absolute flex flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={p.color}>
                      <path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z" />
                    </svg>
                    <span className="text-[9.5px] bg-white text-indigo-950 px-1.5 py-0.5 rounded mt-0.5 font-bold whitespace-nowrap">
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-line">
                <h3 className="text-[15.5px]">Exceptions</h3>
                <a href="#" className="text-[13px] text-indigo-600 font-semibold">Resolve →</a>
              </div>
              {exceptions.map((ex) => (
                <div key={ex.id} className="flex gap-3 px-5 py-4 border-b border-line last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-[#d64545] mt-1.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-[13.5px] mb-0.5">{ex.headline}</h5>
                    <p className="text-xs text-ink-soft">
                      {ex.runnerName} · <span className="font-mono text-[11px]">#{ex.jobId}</span> · {ex.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium mb-0.5 transition ${
        active ? "bg-coral text-white" : "text-indigo-100 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </a>
  );
}