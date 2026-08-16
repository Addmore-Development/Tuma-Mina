import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Button from "../components/Button";
import type { PlatformJob, RunnerApplication, RunnerProfile, SupervisorAccount, TownName, KYCDocument } from "../types/platform";
import { TOWNS, isApplicationComplete } from "../types/platform";

// TODO: replace all three with real GET endpoints on mount.
const initialJobs: PlatformJob[] = [
  { id: "TM-4821", title: "Collect a parcel from the courier depot", category: "Delivery", town: "Rustenburg", location: "Rustenburg CBD", customerName: "Kagiso T.", runnerName: "Thabo M.", status: "in_progress", price: 90, platformFee: 13.5, postedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(), deadline: new Date(Date.now() + 26 * 3_600_000).toISOString() },
  { id: "TM-4790", title: "Queue at Home Affairs for an ID renewal", category: "Queuing", town: "Rustenburg", location: "Home Affairs, Rustenburg", customerName: "Kagiso T.", status: "posted", price: 60, platformFee: 9, postedAt: new Date(Date.now() - 20 * 3_600_000).toISOString(), deadline: new Date(Date.now() + 3 * 24 * 3_600_000).toISOString() },
  { id: "TM-4756", title: "Grocery run for the week", category: "Shopping", town: "Johannesburg", location: "Waterfall Mall", customerName: "Palesa N.", runnerName: "Ayanda B.", status: "completed", price: 250, platformFee: 37.5, postedAt: new Date(Date.now() - 3 * 24 * 3_600_000).toISOString(), deadline: new Date(Date.now() - 2 * 24 * 3_600_000).toISOString() },
  { id: "TM-4703", title: "Fetch signed lease documents", category: "Document", town: "Pretoria", location: "Fourways", customerName: "Lindiwe D.", status: "disputed", price: 70, platformFee: 10.5, postedAt: new Date(Date.now() - 30 * 3_600_000).toISOString(), deadline: new Date(Date.now() - 5 * 3_600_000).toISOString() },
];

function mockDoc(name: string): KYCDocument {
  return { fileName: name, uploadedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), status: "pending" };
}

const initialApplications: RunnerApplication[] = [
  {
    id: "RA-1050", name: "Sipho", surname: "Radebe", phone: "+27 83 111 2222", email: "sipho@example.com",
    town: "Rustenburg", idNumber: "9501015555088", address: "12 Church St, Rustenburg",
    headshot: mockDoc("sipho_headshot.jpg"), idDocument: mockDoc("sipho_id.pdf"),
    bankProof: mockDoc("sipho_bank.pdf"), addressProof: mockDoc("sipho_address.pdf"),
    appliedAt: new Date(Date.now() - 1 * 3_600_000).toISOString(), status: "pending",
  },
  {
    id: "RA-1051", name: "Naledi", surname: "Khumalo", phone: "+27 84 333 4444", email: "naledi@example.com",
    town: "Johannesburg", idNumber: "9702025555088", address: "45 Main Rd, Johannesburg",
    headshot: mockDoc("naledi_headshot.jpg"), idDocument: mockDoc("naledi_id.pdf"),
    bankProof: mockDoc("naledi_bank.pdf"), addressProof: null, // incomplete on purpose, for the demo
    appliedAt: new Date(Date.now() - 6 * 3_600_000).toISOString(), status: "pending",
  },
];

const initialRunners: RunnerProfile[] = [
  { id: "R-01", applicationId: "RA-1042", name: "Thabo Molefe", town: "Rustenburg", phone: "+27 82 555 0143", email: "thabo@example.com", rating: 4.9, completedJobs: 38, status: "active", joinedAt: new Date(Date.now() - 60 * 86_400_000).toISOString() },
  { id: "R-02", applicationId: "RA-1039", name: "Ayanda Bhengu", town: "Johannesburg", phone: "+27 81 222 9090", email: "ayanda@example.com", rating: 4.6, completedJobs: 21, status: "active", joinedAt: new Date(Date.now() - 40 * 86_400_000).toISOString() },
];

const initialSupervisors: SupervisorAccount[] = [
  { id: "S-01", name: "Naledi K.", email: "naledi.supervisor@example.com", town: "All towns", createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(), status: "active", canViewFinancials: true },
];

type View = "overview" | "jobs" | "applications" | "runners" | "supervisors" | "finance";

export default function AdminDashboard() {
  const [jobs] = useState<PlatformJob[]>(initialJobs);
  const [applications, setApplications] = useState<RunnerApplication[]>(initialApplications);
  const [runners, setRunners] = useState<RunnerProfile[]>(initialRunners);
  const [supervisors, setSupervisors] = useState<SupervisorAccount[]>(initialSupervisors);
  const [view, setView] = useState<View>("overview");
  const [jobTownFilter, setJobTownFilter] = useState<TownName | "all">("all");
  const [showAddSupervisor, setShowAddSupervisor] = useState(false);

  const pendingApplications = useMemo(() => applications.filter((a) => a.status === "pending"), [applications]);
  const activeRunners = useMemo(() => runners.filter((r) => r.status === "active"), [runners]);
  const revenue = useMemo(() => jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.platformFee, 0), [jobs]);
  const totalHandled = useMemo(() => jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.price, 0), [jobs]);
  const filteredJobs = useMemo(() => (jobTownFilter === "all" ? jobs : jobs.filter((j) => j.town === jobTownFilter)), [jobs, jobTownFilter]);

  function approveApplication(app: RunnerApplication) {
    if (!isApplicationComplete(app)) return; // safety net — button is already disabled for this
    // TODO: POST /api/admin/applications/:id/approve — should also provision runner login credentials
    setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "approved" } : a)));
    setRunners((prev) => [
      { id: `R-${prev.length + 1}`.padStart(4, "0"), applicationId: app.id, name: `${app.name} ${app.surname}`, town: app.town, phone: app.phone, email: app.email, rating: 0, completedJobs: 0, status: "active", joinedAt: new Date().toISOString() },
      ...prev,
    ]);
  }

  function rejectApplication(app: RunnerApplication, reason: string) {
    // TODO: POST /api/admin/applications/:id/reject
    setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "rejected", rejectionReason: reason } : a)));
  }

  function toggleRunnerStatus(runner: RunnerProfile) {
    // TODO: PATCH /api/admin/runners/:id
    setRunners((prev) => prev.map((r) => (r.id === runner.id ? { ...r, status: r.status === "active" ? "suspended" : "active" } : r)));
  }

  function addSupervisor(name: string, email: string, town: TownName | "All towns", canViewFinancials: boolean) {
    // TODO: POST /api/admin/supervisors — should also send an invite email
    setSupervisors((prev) => [{ id: `S-${prev.length + 1}`.padStart(4, "0"), name, email, town, createdAt: new Date().toISOString(), status: "active", canViewFinancials }, ...prev]);
    setShowAddSupervisor(false);
  }

  function toggleSupervisorStatus(sup: SupervisorAccount) {
    setSupervisors((prev) => prev.map((s) => (s.id === sup.id ? { ...s, status: s.status === "active" ? "suspended" : "active" } : s)));
  }

  function toggleSupervisorFinance(sup: SupervisorAccount) {
    // TODO: PATCH /api/admin/supervisors/:id — flips whether this supervisor can see wallet/escrow data
    setSupervisors((prev) => prev.map((s) => (s.id === sup.id ? { ...s, canViewFinancials: !s.canViewFinancials } : s)));
  }

  const navItems: { key: View; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "jobs", label: "All jobs" },
    { key: "applications", label: "Runner applications", badge: pendingApplications.length },
    { key: "runners", label: "Runners" },
    { key: "supervisors", label: "Supervisors" },
    { key: "finance", label: "Finance" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] min-h-screen bg-lavender-100">
      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mb-2.5 ml-2.5">Admin</div>
        {navItems.map((n) => (
          <NavItem key={n.key} label={n.label} active={view === n.key} badge={n.badge} onClick={() => setView(n.key)} />
        ))}
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

      <main className="px-5 md:px-9 py-7">
        {view === "overview" && (
          <>
            <PageHeader title="Admin overview" subtitle="Platform-wide status across every town." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
              <StatCard label="Jobs on platform" value={String(jobs.length)} />
              <StatCard label="Active runners" value={String(activeRunners.length)} />
              <StatCard label="Pending applications" value={String(pendingApplications.length)} warn={pendingApplications.length > 0} />
              <StatCard label="Platform revenue" value={`R${revenue.toFixed(2)}`} />
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
                      <p className="text-[13.5px] font-medium">{a.name} {a.surname}</p>
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
            <div className="flex gap-2 mb-4 flex-wrap">
              <TownFilterPill label="All towns" active={jobTownFilter === "all"} onClick={() => setJobTownFilter("all")} />
              {TOWNS.map((t) => (
                <TownFilterPill key={t} label={t} active={jobTownFilter === t} onClick={() => setJobTownFilter(t)} />
              ))}
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
                  {filteredJobs.map((j) => (
                    <tr key={j.id}>
                      <td className="px-4 py-3 text-[13px] border-b border-line">
                        <span className="font-mono text-[11px] text-ink-soft block">#{j.id}</span>
                        {j.title}
                      </td>
                      <td className="px-4 py-3 text-[13px] border-b border-line">{j.town}</td>
                      <td className="px-4 py-3 text-[13px] border-b border-line">{j.customerName}</td>
                      <td className="px-4 py-3 text-[13px] border-b border-line">{j.runnerName ?? "Unassigned"}</td>
                      <td className="px-4 py-3 border-b border-line"><JobStatusPill status={j.status} /></td>
                      <td className="px-4 py-3 text-[13px] font-semibold border-b border-line">R{j.price}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft border-b border-line">R{j.platformFee.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === "applications" && (
          <>
            <PageHeader title="Runner applications" subtitle="Review ID, headshot, bank and address proof before approving a runner." />
            <div className="flex flex-col gap-3">
              {applications.filter((a) => a.status === "pending").length === 0 ? (
                <p className="text-[13.5px] text-ink-soft py-8 text-center">No pending applications.</p>
              ) : (
                applications
                  .filter((a) => a.status === "pending")
                  .map((a) => <ApplicationRow key={a.id} application={a} onApprove={() => approveApplication(a)} onReject={(reason) => rejectApplication(a, reason)} />)
              )}
            </div>
          </>
        )}

        {view === "runners" && (
          <>
            <PageHeader title="Runners" subtitle="Everyone currently approved to accept jobs." />
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              {runners.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 flex-wrap">
                  <div>
                    <p className="text-[13.5px] font-semibold">{r.name}</p>
                    <p className="text-[12px] text-ink-soft">{r.town} · {r.completedJobs} jobs · ★ {r.rating.toFixed(1)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full ${r.status === "active" ? "bg-[#e9faf1] text-[#1f9d5c]" : "bg-[#f1f1f5] text-ink-soft"}`}>
                      {r.status === "active" ? "Active" : "Suspended"}
                    </span>
                    <Button size="md" variant="ghost" onClick={() => toggleRunnerStatus(r)}>
                      {r.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </div>
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
                    <p className="text-[13.5px] font-semibold">{s.name}</p>
                    <p className="text-[12px] text-ink-soft">{s.email} · {s.town}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSupervisorFinance(s)}
                      className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full transition ${
                        s.canViewFinancials ? "bg-lavender-100 text-indigo-600" : "bg-[#f1f1f5] text-ink-soft"
                      }`}
                    >
                      {s.canViewFinancials ? "Can view financials" : "No financial access"}
                    </button>
                    <span className={`text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full ${s.status === "active" ? "bg-[#e9faf1] text-[#1f9d5c]" : "bg-[#f1f1f5] text-ink-soft"}`}>
                      {s.status === "active" ? "Active" : "Suspended"}
                    </span>
                    <Button size="md" variant="ghost" onClick={() => toggleSupervisorStatus(s)}>
                      {s.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {showAddSupervisor && <AddSupervisorModal onClose={() => setShowAddSupervisor(false)} onCreate={addSupervisor} />}
          </>
        )}

        {view === "finance" && (
          <>
            <PageHeader title="Finance" subtitle="Admin-only view of platform revenue and job values." />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7 max-w-[800px]">
              <StatCard label="Total handled (completed jobs)" value={`R${totalHandled.toFixed(2)}`} />
              <StatCard label="Platform fees earned" value={`R${revenue.toFixed(2)}`} />
              <StatCard label="Completed jobs" value={String(jobs.filter((j) => j.status === "completed").length)} />
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden max-w-[800px]">
              <div className="px-5 py-3.5 border-b border-line"><h3 className="text-[14px] font-semibold">Completed job payouts</h3></div>
              {jobs.filter((j) => j.status === "completed").map((j) => (
                <div key={j.id} className="flex items-center justify-between px-5 py-3.5 border-b border-line last:border-b-0 text-[13px]">
                  <span>#{j.id} · {j.title}</span>
                  <span>
                    <span className="font-semibold">R{j.price}</span>{" "}
                    <span className="text-ink-soft">(fee R{j.platformFee.toFixed(2)})</span>
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

function DocRow({ label, doc }: { label: string; doc: KYCDocument | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-[1.5px] border-line rounded-lg">
      <div>
        <p className="text-[12px] text-ink-soft">{label}</p>
        <p className={`text-[13px] font-medium ${!doc ? "text-[#a83232]" : ""}`}>{doc ? doc.fileName : "Not submitted"}</p>
      </div>
      {doc && (
        // TODO: link to the real stored file URL once uploads go to real storage
        <button type="button" className="text-[12px] text-indigo-600 font-semibold flex-shrink-0">View</button>
      )}
    </div>
  );
}

function ApplicationRow({ application, onApprove, onReject }: { application: RunnerApplication; onApprove: () => void; onReject: (reason: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const complete = isApplicationComplete(application);
  return (
    <div className="bg-white rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-[14.5px] font-semibold">{application.name} {application.surname}</p>
          <p className="text-[12.5px] text-ink-soft">{application.town} · Applied {new Date(application.appliedAt).toLocaleDateString()}</p>
        </div>
        {!rejecting && (
          <div className="flex gap-2">
            <Button size="md" variant="ghost" onClick={() => setRejecting(true)} className="!text-[#a83232] hover:!border-[#a83232]">Reject</Button>
            <Button
              size="md"
              onClick={onApprove}
              disabled={!complete}
              className={!complete ? "opacity-50 pointer-events-none" : ""}
            >
              Approve
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12.5px] mb-3.5">
        <DetailRow label="ID number" value={application.idNumber} />
        <DetailRow label="Address" value={application.address} />
        <DetailRow label="Phone" value={application.phone} />
        <DetailRow label="Email" value={application.email} />
      </div>

      <p className="text-[11.5px] uppercase tracking-wide text-ink-soft mb-2">Verification documents</p>
      <div className="grid grid-cols-2 gap-2.5">
        <DocRow label="Headshot" doc={application.headshot} />
        <DocRow label="ID document" doc={application.idDocument} />
        <DocRow label="Proof of bank account" doc={application.bankProof} />
        <DocRow label="Proof of address" doc={application.addressProof} />
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

function AddSupervisorModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, email: string, town: TownName | "All towns", canViewFinancials: boolean) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [town, setTown] = useState<TownName | "All towns">("All towns");
  const [canViewFinancials, setCanViewFinancials] = useState(true);
  return (
    <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] mb-4">Add a supervisor</h3>
        <div className="flex flex-col gap-3.5 mb-5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="px-[15px] py-3 border-[1.5px] border-line rounded-xl text-[14px] focus:outline-none focus:border-indigo-500" />
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
          <Button block disabled={!name.trim() || !email.trim()} onClick={() => onCreate(name.trim(), email.trim(), town, canViewFinancials)}>Create account</Button>
        </div>
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

function TownFilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
        active ? "bg-indigo-950 text-white" : "bg-white border border-line text-ink-soft hover:border-indigo-400 hover:text-indigo-600"
      }`}
    >
      {label}
    </button>
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

function DetailRow({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-ink-soft text-[11px]">{label}</p>
      <p className={`font-medium ${warn ? "text-[#a83232]" : ""}`}>{value}</p>
    </div>
  );
}