import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import type { CustomerTask, WalletTransaction } from "../types/types";
import CustomerStatusBadge from "./components/CustomerStatusBadge";
import PostTaskForm from "./components/PostTaskForm";
import TaskDetail from "./components/TaskDetail";
import WalletPanel from "./components/WalletPanel";
import RateRunnerModal from "./components/RateRunnerModal";
import { categoryIcons } from "./categoryIcons";
import { IconClock, IconPackage, IconWallet } from "./icons";

// TODO: replace with GET /api/customer/tasks on mount, and swap the useState calls
// below for the corresponding POST/PATCH calls as noted in each component.
const initialTasks: CustomerTask[] = [
  {
    id: "TM-4821",
    title: "Collect a parcel from the courier depot",
    category: "Delivery",
    description: "Waybill number will be sent over WhatsApp once you accept.",
    deliveryMode: "location",
    location: "Rustenburg CBD",
    deadline: new Date(Date.now() + 26 * 3_600_000).toISOString(),
    budget: 90,
    status: "in_progress",
    quotes: [{ id: "q-4821", runnerName: "Kagiso T.", runnerRating: 4.9, price: 90 }],
    acceptedQuote: { id: "q-4821", runnerName: "Kagiso T.", runnerRating: 4.9, price: 90 },
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
  {
    id: "TM-4790",
    title: "Queue at Home Affairs for an ID renewal",
    category: "Queuing",
    description: "",
    deliveryMode: "person",
    location: "Home Affairs, Rustenburg",
    deadline: new Date(Date.now() + 3 * 24 * 3_600_000).toISOString(),
    budget: null,
    status: "posted",
    quotes: [
      { id: "q-4790a", runnerName: "Sipho R.", runnerRating: 4.7, price: 60, note: "Available from 7am." },
      { id: "q-4790b", runnerName: "Ayanda B.", runnerRating: 4.5, price: 55 },
    ],
    pin: "5217",
    createdAt: new Date(Date.now() - 20 * 3_600_000).toISOString(),
  },
  {
    id: "TM-4756",
    title: "Grocery run for the week",
    category: "Shopping",
    description: "List will be shared once accepted.",
    deliveryMode: "location",
    location: "Waterfall Mall, Rustenburg",
    deadline: new Date(Date.now() - 2 * 24 * 3_600_000).toISOString(),
    budget: 250,
    status: "completed",
    quotes: [{ id: "q-4756", runnerName: "Palesa N.", runnerRating: 4.6, price: 250 }],
    acceptedQuote: { id: "q-4756", runnerName: "Palesa N.", runnerRating: 4.6, price: 250 },
    proofPhotoUrl: "mock-proof-photo",
    completedAt: new Date(Date.now() - 2 * 24 * 3_600_000 + 3_600_000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 3_600_000).toISOString(),
    rating: { stars: 5, comment: "Quick and kept me updated." },
  },
];

const initialTransactions: WalletTransaction[] = [
  { id: "t1", taskId: "TM-4821", type: "hold", amount: 90, date: new Date(Date.now() - 2 * 3_600_000).toISOString(), description: "Held for TM-4821 · Collect a parcel" },
  { id: "t2", taskId: "TM-4756", type: "release", amount: 250, date: new Date(Date.now() - 2 * 24 * 3_600_000 + 3_600_000).toISOString(), description: "Released to Palesa N. · TM-4756" },
  { id: "t3", type: "topup", amount: 500, date: new Date(Date.now() - 4 * 24 * 3_600_000).toISOString(), description: "Wallet top-up" },
];

type View = "overview" | "post" | "tasks" | "task-detail" | "wallet";

export default function CustomerDashboard() {
  const [tasks, setTasks] = useState<CustomerTask[]>(initialTasks);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(initialTransactions);
  const [balance, setBalance] = useState(340);
  const [view, setView] = useState<View>("overview");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId) ?? null, [tasks, activeTaskId]);
  const ratingTask = useMemo(() => tasks.find((t) => t.id === ratingTaskId) ?? null, [tasks, ratingTaskId]);

  const held = useMemo(
    () => tasks.filter((t) => ["accepted", "in_progress", "awaiting_confirmation"].includes(t.status)).reduce((sum, t) => sum + (t.acceptedQuote?.price ?? 0), 0),
    [tasks]
  );
  const activeTasks = useMemo(() => tasks.filter((t) => !["completed", "cancelled", "disputed"].includes(t.status)), [tasks]);
  const needsConfirmation = useMemo(() => tasks.filter((t) => t.status === "awaiting_confirmation"), [tasks]);

  function openTask(id: string) {
    setActiveTaskId(id);
    setView("task-detail");
  }

  function handleCreateTask(task: CustomerTask) {
    setTasks((prev) => [task, ...prev]);
    setView("tasks");
  }

  function handleUpdateTask(updated: CustomerTask) {
    setTasks((prev) => {
      const before = prev.find((t) => t.id === updated.id);
      const next = prev.map((t) => (t.id === updated.id ? updated : t));

      // Keep the wallet in sync with task-status transitions so the Wallet tab
      // reflects escrow holds/releases without a separate round trip.
      if (before && before.status !== updated.status) {
        if (updated.status === "accepted" && updated.acceptedQuote) {
          setBalance((b) => b - updated.acceptedQuote!.price);
          setTransactions((tx) => [
            ...tx,
            { id: `t-${updated.id}-hold`, taskId: updated.id, type: "hold", amount: updated.acceptedQuote!.price, date: new Date().toISOString(), description: `Held for ${updated.id} · ${updated.title}` },
          ]);
        }
        if (updated.status === "completed" && updated.acceptedQuote) {
          setTransactions((tx) => [
            ...tx,
            { id: `t-${updated.id}-release`, taskId: updated.id, type: "release", amount: updated.acceptedQuote!.price, date: new Date().toISOString(), description: `Released to ${updated.acceptedQuote!.runnerName} · ${updated.id}` },
          ]);
        }
      }
      return next;
    });
  }

  function handleTopUp(amount: number) {
    setBalance((b) => b + amount);
    setTransactions((tx) => [...tx, { id: `t-topup-${Date.now()}`, type: "topup", amount, date: new Date().toISOString(), description: "Wallet top-up" }]);
  }

  function handleRatingSubmit(stars: number, comment: string) {
    if (!ratingTaskId) return;
    setTasks((prev) => prev.map((t) => (t.id === ratingTaskId ? { ...t, rating: { stars, comment } } : t)));
    setRatingTaskId(null);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] min-h-screen bg-lavender-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />

        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mt-4 mb-2.5 ml-2.5">My account</div>
        <NavItem label="Overview" active={view === "overview"} onClick={() => setView("overview")} />
        <NavItem label="Post a task" active={view === "post"} onClick={() => setView("post")} />
        <NavItem label="My tasks" active={view === "tasks" || view === "task-detail"} onClick={() => setView("tasks")} />
        <NavItem label="Wallet" active={view === "wallet"} onClick={() => setView("wallet")} />

        <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mt-4 mb-2.5 ml-2.5">Account</div>
        <NavItem label="Settings" />
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5">
          Log out
        </Link>

        <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-full bg-coral flex-shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold">Kagiso T.</p>
            <span className="text-[11.5px] text-indigo-300">Customer</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="px-6 md:px-9 py-7">
        {view === "overview" && (
          <>
            <div className="flex justify-between items-center flex-wrap gap-4 mb-7">
              <div>
                <h1 className="text-2xl">Good to see you, Kagiso</h1>
                <p className="text-ink-soft text-[13.5px] mt-1">
                  {activeTasks.length} task{activeTasks.length === 1 ? "" : "s"} on the go right now
                </p>
              </div>
              <button onClick={() => setView("post")} className="bg-coral text-white hover:bg-coral-dark rounded-full font-semibold px-6 py-3 text-[14.5px]">
                + Post a task
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
              <StatCard label="Active tasks" value={String(activeTasks.length)} icon={<IconPackage className="w-[17px] h-[17px] text-indigo-600" />} iconBg="#eeeefc" />
              <StatCard label="Awaiting your confirmation" value={String(needsConfirmation.length)} icon={<IconClock className="w-[17px] h-[17px] text-coral-dark" />} iconBg="#fff2ea" />
              <StatCard label="In escrow" value={`R${held}`} icon={<IconWallet className="w-[17px] h-[17px] text-[#1f9d5c]" />} iconBg="#e9faf1" />
            </div>

            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-line">
                <h3 className="text-[15.5px]">Recent tasks</h3>
                <button onClick={() => setView("tasks")} className="text-[13px] text-indigo-600 font-semibold">View all →</button>
              </div>
              {tasks.slice(0, 4).map((t) => (
                <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} />
              ))}
            </div>
          </>
        )}

        {view === "post" && <PostTaskForm onCreate={handleCreateTask} onCancel={() => setView("overview")} />}

        {view === "tasks" && (
          <>
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
              <h1 className="text-2xl">My tasks</h1>
              <button onClick={() => setView("post")} className="bg-coral text-white hover:bg-coral-dark rounded-full font-semibold px-6 py-3 text-[14.5px]">
                + Post a task
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              {tasks.length === 0 ? (
                <p className="p-6 text-[13.5px] text-ink-soft">You haven't posted any tasks yet.</p>
              ) : (
                tasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} />)
              )}
            </div>
          </>
        )}

        {view === "task-detail" && activeTask && (
          <TaskDetail
            task={activeTask}
            onBack={() => setView("tasks")}
            onUpdate={handleUpdateTask}
            onOpenRating={() => setRatingTaskId(activeTask.id)}
          />
        )}

        {view === "wallet" && <WalletPanel balance={balance} held={held} transactions={transactions} onTopUp={handleTopUp} />}
      </main>

      {ratingTask && (
        <RateRunnerModal
          runnerName={ratingTask.acceptedQuote?.runnerName ?? "your runner"}
          onSubmit={handleRatingSubmit}
          onClose={() => setRatingTaskId(null)}
        />
      )}
    </div>
  );
}

function NavItem({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium mb-0.5 transition text-left w-full ${
        active ? "bg-coral text-white" : "text-indigo-100 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, iconBg }: { label: string; value: string; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-line">
      <div className="flex justify-between items-start mb-3.5">
        <span className="text-xs font-semibold text-ink-soft">{label}</span>
        <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <h3 className="text-[27px]">{value}</h3>
    </div>
  );
}

function TaskRow({ task, onClick }: { task: CustomerTask; onClick: () => void }) {
  const Icon = categoryIcons[task.category];
  return (
    <button onClick={onClick} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line last:border-b-0 w-full text-left hover:bg-paper transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-lavender-100 flex items-center justify-center flex-shrink-0">
          {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold truncate">{task.title}</p>
          <p className="text-[12px] text-ink-soft font-mono">#{task.id}</p>
        </div>
      </div>
      <CustomerStatusBadge status={task.status} />
    </button>
  );
}
