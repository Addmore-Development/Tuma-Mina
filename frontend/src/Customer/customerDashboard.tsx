import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import type { CustomerProfile, CustomerTask, WalletTransaction } from "../types/types";
import CustomerStatusBadge from "./components/CustomerStatusBadge";
import PostTaskForm from "./components/PostTaskForm";
import TaskDetail from "./components/TaskDetail";
import WalletPanel from "./components/WalletPanel";
import RateRunnerModal from "./components/RateRunnerModal";
import SettingsPanel from "./components/SettingsPanel";
import ToastStack, { type ToastMessage } from "./components/Toast";
import { categoryIcons } from "./categoryIcons";
import { IconAlert, IconClock, IconGrid, IconMenu, IconPackage, IconPlus, IconUser, IconWallet } from "./icons";
import { useNow } from "./useNow";

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
    quotes: [{ id: "q-4821", runnerName: "Kagiso T.", runnerRating: 4.9, price: 90, status: "open" }],
    acceptedQuote: { id: "q-4821", runnerName: "Kagiso T.", runnerRating: 4.9, price: 90, status: "open" },
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
      { id: "q-4790a", runnerName: "Sipho R.", runnerRating: 4.7, price: 60, note: "Available from 7am.", status: "open" },
      { id: "q-4790b", runnerName: "Ayanda B.", runnerRating: 4.5, price: 55, status: "open" },
    ],
    pin: "5217",
    createdAt: new Date(Date.now() - 20 * 3_600_000).toISOString(),
  },
  {
    id: "TM-4703",
    title: "Fetch signed lease documents",
    category: "Document",
    description: "",
    deliveryMode: "location",
    location: "Fourways",
    deadline: new Date(Date.now() - 5 * 3_600_000).toISOString(), // overdue on purpose, for the demo
    budget: 70,
    status: "posted",
    quotes: [{ id: "q-4703", runnerName: "Ayanda B.", runnerRating: 4.5, price: 70, status: "open" }],
    createdAt: new Date(Date.now() - 30 * 3_600_000).toISOString(),
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
    quotes: [{ id: "q-4756", runnerName: "Palesa N.", runnerRating: 4.6, price: 250, status: "open" }],
    acceptedQuote: { id: "q-4756", runnerName: "Palesa N.", runnerRating: 4.6, price: 250, status: "open" },
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

const initialProfile: CustomerProfile = {
  name: "Kagiso T.",
  phone: "+27 79 399 0608",
  email: "kagiso@example.com",
  notifyTaskUpdates: true,
  notifyPromotions: false,
};

type View = "overview" | "post" | "tasks" | "task-detail" | "wallet" | "settings";
type TaskFilter = "all" | "active" | "closed";

const CLOSED_STATUSES: CustomerTask["status"][] = ["completed", "cancelled", "disputed"];

export default function CustomerDashboard() {
  const [tasks, setTasks] = useState<CustomerTask[]>(initialTasks);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(initialTransactions);
  const [balance, setBalance] = useState(180);
  const [profile, setProfile] = useState<CustomerProfile>(initialProfile);
  const [view, setView] = useState<View>("overview");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [walletTopUpSuggestion, setWalletTopUpSuggestion] = useState<number | undefined>(undefined);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId) ?? null, [tasks, activeTaskId]);
  const editingTask = useMemo(() => tasks.find((t) => t.id === editingTaskId) ?? null, [tasks, editingTaskId]);
  const ratingTask = useMemo(() => tasks.find((t) => t.id === ratingTaskId) ?? null, [tasks, ratingTaskId]);

  const held = useMemo(
    () => tasks.filter((t) => ["accepted", "in_progress", "awaiting_confirmation"].includes(t.status)).reduce((sum, t) => sum + (t.acceptedQuote?.price ?? 0), 0),
    [tasks]
  );
  const activeTasks = useMemo(() => tasks.filter((t) => !CLOSED_STATUSES.includes(t.status)), [tasks]);
  const needsConfirmation = useMemo(() => tasks.filter((t) => t.status === "awaiting_confirmation"), [tasks]);
  const now = useNow();
  const overdueTasks = useMemo(
    () => tasks.filter((t) => !CLOSED_STATUSES.includes(t.status) && new Date(t.deadline).getTime() < now),
    [tasks, now]
  );
  const filteredTasks = useMemo(() => {
    if (taskFilter === "active") return tasks.filter((t) => !CLOSED_STATUSES.includes(t.status));
    if (taskFilter === "closed") return tasks.filter((t) => CLOSED_STATUSES.includes(t.status));
    return tasks;
  }, [tasks, taskFilter]);

  function pushToast(text: string, tone: ToastMessage["tone"] = "success") {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
  }
  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function goTo(next: View) {
    setView(next);
    setMobileNavOpen(false);
  }

  function openTask(id: string) {
    setActiveTaskId(id);
    setView("task-detail");
    setMobileNavOpen(false);
  }

  function startPostTask() {
    setEditingTaskId(null);
    setView("post");
    setMobileNavOpen(false);
  }

  function startEditTask(id: string) {
    setEditingTaskId(id);
    setView("post");
    setMobileNavOpen(false);
  }

  function handlePostSubmit(task: CustomerTask) {
    const isEdit = tasks.some((t) => t.id === task.id) && editingTaskId === task.id;
    if (isEdit) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      pushToast("Task updated.", "success");
      setEditingTaskId(null);
      openTask(task.id);
    } else {
      setTasks((prev) => [task, ...prev]);
      pushToast("Task posted — nearby runners have been notified.", "success");
      setView("tasks");
    }
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

  function handleDeleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    pushToast("Removed from your history.", "success");
    setView("tasks");
  }

  function handleTopUp(amount: number) {
    setBalance((b) => b + amount);
    setTransactions((tx) => [...tx, { id: `t-topup-${Date.now()}`, type: "topup", amount, date: new Date().toISOString(), description: "Wallet top-up" }]);
    setWalletTopUpSuggestion(undefined);
    pushToast(`R${amount.toFixed(2)} added to your wallet.`, "success");
  }

  function handleNavigateToWallet(suggested?: number) {
    setWalletTopUpSuggestion(suggested);
    setView("wallet");
  }

  function handleRatingSubmit(stars: number, comment: string) {
    if (!ratingTaskId) return;
    setTasks((prev) => prev.map((t) => (t.id === ratingTaskId ? { ...t, rating: { stars, comment } } : t)));
    setRatingTaskId(null);
    pushToast("Thanks for the feedback!", "success");
  }

  function handleSaveProfile(next: CustomerProfile) {
    setProfile(next);
    pushToast("Settings saved.", "success");
  }

  const navItems: { key: View; label: string; icon: (p: { className?: string }) => ReactNode }[] = [
    { key: "overview", label: "Overview", icon: IconGrid },
    { key: "post", label: "Post a task", icon: IconPlus },
    { key: "tasks", label: "My tasks", icon: IconClock },
    { key: "wallet", label: "Wallet", icon: IconWallet },
    { key: "settings", label: "Settings", icon: IconUser },
  ];

  return (
    <div className="min-h-screen bg-lavender-100 md:grid md:grid-cols-[250px_1fr]">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-indigo-950 text-white px-4 py-3.5">
        <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="p-1 -ml-1">
          <IconMenu className="w-6 h-6" />
        </button>
        <Logo light />
        <button onClick={() => goTo("wallet")} className="text-[12.5px] font-semibold bg-white/10 px-2.5 py-1.5 rounded-full">
          R{balance.toFixed(0)}
        </button>
      </div>

      {/* Mobile off-canvas nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-indigo-950/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[270px] bg-indigo-950 text-white px-[18px] py-[22px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <Logo light />
              <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-white/70">✕</button>
            </div>
            <SidebarNav navItems={navItems} view={view} onSelect={goTo} />
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5 mt-2">
              Log out
            </Link>
            <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
              <div className="w-[26px] h-[26px] rounded-full bg-coral flex-shrink-0" />
              <div>
                <p className="text-[13.5px] font-semibold">{profile.name}</p>
                <span className="text-[11.5px] text-indigo-300">Customer</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col bg-indigo-950 text-white px-[18px] py-[26px]">
        <Logo light className="mb-9 pl-1.5" />
        <SidebarNav navItems={navItems} view={view} onSelect={goTo} />
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium text-[#e8927f] hover:bg-white/5 mt-2">
          Log out
        </Link>
        <div className="mt-auto pt-5 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-full bg-coral flex-shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold">{profile.name}</p>
            <span className="text-[11.5px] text-indigo-300">Customer</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="px-4 sm:px-6 md:px-9 py-6 md:py-7 pb-24 md:pb-7">
        {view === "overview" && (
          <>
            <div className="flex justify-between items-center flex-wrap gap-4 mb-6 md:mb-7">
              <div>
                <h1 className="text-xl sm:text-2xl">Good to see you, {profile.name.split(" ")[0]}</h1>
                <p className="text-ink-soft text-[13px] sm:text-[13.5px] mt-1">
                  {activeTasks.length} task{activeTasks.length === 1 ? "" : "s"} on the go right now
                </p>
              </div>
              <button onClick={startPostTask} className="hidden sm:inline-flex items-center gap-1.5 bg-coral text-white hover:bg-coral-dark rounded-full font-semibold px-6 py-3 text-[14.5px]">
                <IconPlus className="w-4 h-4" /> Post a task
              </button>
            </div>

            {tasks.length === 0 ? (
              <EmptyState onPost={startPostTask} />
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-7">
                  <StatCard label="Active tasks" value={String(activeTasks.length)} icon={<IconPackage className="w-[17px] h-[17px] text-indigo-600" />} iconBg="#eeeefc" />
                  <StatCard label="Awaiting confirmation" value={String(needsConfirmation.length)} icon={<IconClock className="w-[17px] h-[17px] text-coral-dark" />} iconBg="#fff2ea" />
                  <StatCard label="Overdue" value={String(overdueTasks.length)} icon={<IconAlert className="w-[17px] h-[17px] text-[#d64545]" />} iconBg="#fdeaea" warn={overdueTasks.length > 0} />
                  <StatCard label="In escrow" value={`R${held}`} icon={<IconWallet className="w-[17px] h-[17px] text-[#1f9d5c]" />} iconBg="#e9faf1" />
                </div>

                <div className="bg-white rounded-2xl border border-line overflow-hidden">
                  <div className="flex justify-between items-center px-5 py-4 border-b border-line">
                    <h3 className="text-[15.5px]">Recent tasks</h3>
                    <button onClick={() => goTo("tasks")} className="text-[13px] text-indigo-600 font-semibold">View all →</button>
                  </div>
                  {tasks.slice(0, 4).map((t) => (
                    <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {view === "post" && (
          <PostTaskForm
            mode={editingTask ? "edit" : "create"}
            initialTask={editingTask ?? undefined}
            onSubmit={handlePostSubmit}
            onCancel={() => {
              setEditingTaskId(null);
              setView(editingTask ? "task-detail" : "overview");
            }}
          />
        )}

        {view === "tasks" && (
          <>
            <div className="flex justify-between items-center flex-wrap gap-4 mb-5">
              <h1 className="text-xl sm:text-2xl">My tasks</h1>
              <button onClick={startPostTask} className="hidden sm:inline-flex items-center gap-1.5 bg-coral text-white hover:bg-coral-dark rounded-full font-semibold px-6 py-3 text-[14.5px]">
                <IconPlus className="w-4 h-4" /> Post a task
              </button>
            </div>

            <div className="flex bg-white border border-line p-1 rounded-full mb-5 w-fit">
              {(["all", "active", "closed"] as TaskFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition ${
                    taskFilter === f ? "bg-indigo-950 text-white" : "text-ink-soft hover:text-indigo-600"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              {tasks.length === 0 ? (
                <div className="p-6"><EmptyState onPost={startPostTask} compact /></div>
              ) : filteredTasks.length === 0 ? (
                <p className="p-6 text-[13.5px] text-ink-soft">No tasks in this view.</p>
              ) : (
                filteredTasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} />)
              )}
            </div>
          </>
        )}

        {view === "task-detail" && activeTask && (
          <TaskDetail
            task={activeTask}
            balance={balance}
            onBack={() => setView("tasks")}
            onUpdate={handleUpdateTask}
            onOpenRating={() => setRatingTaskId(activeTask.id)}
            onEdit={() => startEditTask(activeTask.id)}
            onDelete={() => handleDeleteTask(activeTask.id)}
            onNavigateToWallet={handleNavigateToWallet}
            onToast={pushToast}
          />
        )}

        {view === "wallet" && (
          <WalletPanel balance={balance} held={held} transactions={transactions} onTopUp={handleTopUp} suggestedTopUp={walletTopUpSuggestion} />
        )}

        {view === "settings" && <SettingsPanel profile={profile} onSave={handleSaveProfile} />}
      </main>

      {/* Mobile floating "post a task" button — kept off the Post view itself */}
      {view !== "post" && (
        <button
          onClick={startPostTask}
          aria-label="Post a task"
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-coral text-white shadow-lg2 flex items-center justify-center"
        >
          <IconPlus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-line flex items-stretch">
        {navItems
          .filter((n) => n.key !== "post")
          .map((n) => {
            const Icon = n.icon;
            const active = view === n.key || (n.key === "tasks" && view === "task-detail");
            return (
              <button
                key={n.key}
                onClick={() => goTo(n.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium ${active ? "text-indigo-600" : "text-ink-soft"}`}
              >
                <Icon className="w-5 h-5" />
                {n.label === "Post a task" ? "Post" : n.label}
              </button>
            );
          })}
      </nav>

      {ratingTask && (
        <RateRunnerModal
          runnerName={ratingTask.acceptedQuote?.runnerName ?? "your runner"}
          onSubmit={handleRatingSubmit}
          onClose={() => setRatingTaskId(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function SidebarNav({
  navItems,
  view,
  onSelect,
}: {
  navItems: { key: View; label: string; icon: (p: { className?: string }) => ReactNode }[];
  view: View;
  onSelect: (v: View) => void;
}) {
  return (
    <>
      <div className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-400/80 mt-2 mb-2.5 ml-2.5">My account</div>
      {navItems.map((n) => {
        const Icon = n.icon;
        const active = view === n.key || (n.key === "tasks" && view === "task-detail");
        return (
          <NavItem key={n.key} label={n.label} icon={<Icon className="w-[17px] h-[17px]" />} active={active} onClick={() => onSelect(n.key)} />
        );
      })}
    </>
  );
}

function NavItem({ label, icon, active = false, onClick }: { label: string; icon?: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium mb-0.5 transition text-left w-full ${
        active ? "bg-coral text-white" : "text-indigo-100 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, iconBg, warn = false }: { label: string; value: string; icon: ReactNode; iconBg: string; warn?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border ${warn ? "border-[#f3c5c5]" : "border-line"}`}>
      <div className="flex justify-between items-start mb-3 sm:mb-3.5">
        <span className="text-[11px] sm:text-xs font-semibold text-ink-soft leading-tight pr-1">{label}</span>
        <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <h3 className="text-[22px] sm:text-[27px]">{value}</h3>
    </div>
  );
}

function TaskRow({ task, onClick }: { task: CustomerTask; onClick: () => void }) {
  const Icon = categoryIcons[task.category];
  const now = useNow();
  const overdue = !CLOSED_STATUSES.includes(task.status) && new Date(task.deadline).getTime() < now;
  return (
    <button onClick={onClick} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-line last:border-b-0 w-full text-left hover:bg-paper transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-lavender-100 flex items-center justify-center flex-shrink-0">
          {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold truncate">{task.title}</p>
          <p className="text-[12px] text-ink-soft font-mono">#{task.id}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {overdue && <IconAlert className="w-4 h-4 text-[#d64545]" />}
        <CustomerStatusBadge status={task.status} />
      </div>
    </button>
  );
}

function EmptyState({ onPost, compact = false }: { onPost: () => void; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-16"}`}>
      <div className="w-14 h-14 rounded-2xl bg-lavender-100 flex items-center justify-center mb-4">
        <IconPackage className="w-6 h-6 text-indigo-600" />
      </div>
      <h3 className="text-[16px] mb-1.5">No tasks yet</h3>
      <p className="text-[13.5px] text-ink-soft mb-5 max-w-[320px]">Post your first task and nearby runners will start sending quotes.</p>
      <button onClick={onPost} className="inline-flex items-center gap-1.5 bg-coral text-white hover:bg-coral-dark rounded-full font-semibold px-6 py-3 text-[14.5px]">
        <IconPlus className="w-4 h-4" /> Post a task
      </button>
    </div>
  );
}
