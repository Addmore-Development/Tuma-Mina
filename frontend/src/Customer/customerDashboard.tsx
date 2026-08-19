import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { IconAlert, IconBell, IconClock, IconGrid, IconMenu, IconPackage, IconPlus, IconSearch, IconUser, IconWallet } from "./icons";
import { useNow } from "./useNow";
import { formatRelativeTime } from "./formatRelativeTime";
import {
  fetchMyTasks,
  fetchMyProfile,
  fetchWallet,
  fetchSavedLocations,
  postTask as apiPostTask,
  updateTaskDetails as apiUpdateTaskDetails,
  deleteTask as apiDeleteTask,
  cancelTask as apiCancelTask,
  raiseDispute as apiRaiseDispute,
  acceptQuote as apiAcceptQuote,
  approveAndRelease as apiApproveAndRelease,
  fundTask as apiFundTask,
  submitRating as apiSubmitRating,
  devTopUpWallet,
  updateCustomerProfile as apiUpdateCustomerProfile,
  saveLocation as apiSaveLocation,
  type PostTaskInput,
} from "../lib/supabase/customer";
import { subscribeToTables, unsubscribe } from "../lib/supabase/realtime";
import { getErrorMessage } from "../lib/getErrorMessage";

interface SavedLocation {
  label: string;
  address: string;
}

interface NotificationItem {
  id: string;
  text: string;
  tone: ToastMessage["tone"];
  at: string;
  read: boolean;
  taskId?: string;
}

type View = "overview" | "post" | "tasks" | "task-detail" | "wallet" | "settings";
type TaskFilter = "all" | "active" | "closed";
type TaskSort = "newest" | "deadline";
type StatusFilter = "awaiting_confirmation" | "overdue" | null;

const CLOSED_STATUSES: CustomerTask["status"][] = ["completed", "cancelled", "disputed"];

const emptyProfile: CustomerProfile = {
  name: "", surname: "", idNumber: "", address: "", phone: "", email: "",
  notifyTaskUpdates: true, notifyPromotions: false,
};

export default function CustomerDashboard() {
  const [tasks, setTasks] = useState<CustomerTask[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>("overview");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [duplicateSeed, setDuplicateSeed] = useState<CustomerTask | null>(null);
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [taskSort, setTaskSort] = useState<TaskSort>("newest");
  const [taskSearch, setTaskSearch] = useState("");
  const [walletTopUpSuggestion, setWalletTopUpSuggestion] = useState<number | undefined>(undefined);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const idCounter = useRef(0);

  async function loadAll() {
    try {
      const [myTasks, myProfile, wallet, locations] = await Promise.all([
        fetchMyTasks(),
        fetchMyProfile(),
        fetchWallet(),
        fetchSavedLocations(),
      ]);
      setTasks(myTasks);
      setProfile(myProfile);
      setBalance(wallet.balance);
      setTransactions(wallet.transactions);
      setSavedLocations((locations ?? []).map((l: any) => ({ label: l.label, address: l.address })));
      setLoadError(null);
    } catch (e) {
      setLoadError(getErrorMessage(e, "Failed to load your dashboard."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const channels = subscribeToTables(
      [{ table: "tasks" }, { table: "quotes" }, { table: "wallet_transactions" }, { table: "wallets" }],
      loadAll
    );
    return () => {
      unsubscribe(channels);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId) ?? null, [tasks, activeTaskId]);
  const editingTask = useMemo(() => tasks.find((t) => t.id === editingTaskId) ?? null, [tasks, editingTaskId]);
  const ratingTask = useMemo(() => tasks.find((t) => t.id === ratingTaskId) ?? null, [tasks, ratingTaskId]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

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
    let list = tasks;
    if (statusFilter === "overdue") {
      list = list.filter((t) => !CLOSED_STATUSES.includes(t.status) && new Date(t.deadline).getTime() < now);
    } else if (statusFilter) {
      list = list.filter((t) => t.status === statusFilter);
    } else if (taskFilter === "active") {
      list = list.filter((t) => !CLOSED_STATUSES.includes(t.status));
    } else if (taskFilter === "closed") {
      list = list.filter((t) => CLOSED_STATUSES.includes(t.status));
    }
    const q = taskSearch.trim().toLowerCase();
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    list = [...list];
    if (taskSort === "deadline") list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [tasks, taskFilter, statusFilter, taskSearch, taskSort, now]);

  function pushToast(text: string, tone: ToastMessage["tone"] = "success", taskId?: string) {
    idCounter.current += 1;
    const id = `note-${idCounter.current}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setNotifications((prev) => [{ id, text, tone, at: new Date(now).toISOString(), read: false, taskId }, ...prev].slice(0, 30));
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
    setDuplicateSeed(null);
    setView("post");
    setMobileNavOpen(false);
  }

  function startEditTask(id: string) {
    setEditingTaskId(id);
    setDuplicateSeed(null);
    setView("post");
    setMobileNavOpen(false);
  }

  function startDuplicateTask(task: CustomerTask) {
    setEditingTaskId(null);
    setDuplicateSeed({ ...task, deadline: "" });
    setView("post");
    setMobileNavOpen(false);
  }

  async function handlePostSubmit(task: CustomerTask) {
    const isEdit = !!editingTaskId && tasks.some((t) => t.id === task.id) && editingTaskId === task.id;
    try {
      if (isEdit) {
        await apiUpdateTaskDetails(task.id, {
          title: task.title,
          category: task.category,
          description: task.description,
          deliveryMode: task.deliveryMode as PostTaskInput["deliveryMode"],
          location: task.location,
          deadline: task.deadline,
          budget: task.budget,
        });
        pushToast("Task updated.", "success", task.id);
        setEditingTaskId(null);
        await loadAll();
        openTask(task.id);
      } else {
        // NOTE: the post-task form doesn't collect a town yet (see
        // PostTaskForm.tsx) or keep raw File objects for reference photos
        // (it converts them to object URLs for preview only) — both are
        // follow-ups. Defaulting town for now so the task still posts.
        const created = await apiPostTask({
          title: task.title,
          category: task.category,
          description: task.description,
          deliveryMode: task.deliveryMode as PostTaskInput["deliveryMode"],
          location: task.location,
          town: "Rustenburg",
          deadline: task.deadline,
          budget: task.budget,
          referencePhotoFiles: [],
        });
        setDuplicateSeed(null);
        pushToast("Task posted — nearby runners have been notified.", "success", created.id);
        await loadAll();
        setView("tasks");
      }
    } catch (e) {
      pushToast(getErrorMessage(e, "Couldn't save that task."), "error");
    }
  }

  function handlePostCancel() {
    const hadPrefill = !!(editingTaskId || duplicateSeed);
    setEditingTaskId(null);
    setDuplicateSeed(null);
    setView(hadPrefill ? "task-detail" : "overview");
  }

  /**
   * TaskDetail passes back a fully-mutated CustomerTask for a handful of
   * different actions (accept quote, cancel, dispute, mark delivered, PIN
   * confirm...) via a single onUpdate callback. We diff old vs. new status
   * to figure out which backend call to make, apply the change optimistically
   * for a snappy UI, then reconcile with the server.
   */
  async function handleUpdateTask(updated: CustomerTask) {
    const before = tasks.find((t) => t.id === updated.id);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    if (!before || before.status === updated.status) return; // no state transition — nothing to persist beyond local edits

    try {
      if (updated.status === "accepted" && updated.acceptedQuote) {
        await apiAcceptQuote(updated.id, updated.acceptedQuote.id);
      } else if (updated.status === "cancelled") {
        await apiCancelTask(updated.id, updated.cancelReason ?? "");
      } else if (updated.status === "disputed") {
        await apiRaiseDispute(updated.id);
      }
      await loadAll();
    } catch (e) {
      pushToast(getErrorMessage(e, "That action couldn't be saved — refreshing."), "error");
      await loadAll();
    }
  }

  async function approveTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      await apiApproveAndRelease(id);
      pushToast("Payment released. Task complete!", "success", id);
      setRatingTaskId(id);
      await loadAll();
    } catch (e) {
      pushToast(getErrorMessage(e, "Couldn't release payment."), "error");
    }
  }

  async function fundTaskHandler(id: string) {
    try {
      await apiFundTask(id);
      pushToast("Job funded — payment is held safely until it's confirmed done.", "success", id);
      await loadAll();
    } catch (e) {
      pushToast(getErrorMessage(e, "Couldn't fund that job."), "error");
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      await apiDeleteTask(id);
      pushToast("Removed from your history.", "success");
      setView("tasks");
      await loadAll();
    } catch (e) {
      pushToast(getErrorMessage(e, "Couldn't remove that task."), "error");
    }
  }

  async function handleTopUp(amount: number) {
    try {
      await devTopUpWallet(amount);
      setWalletTopUpSuggestion(undefined);
      pushToast(`R${amount.toFixed(2)} added to your wallet.`, "success");
      await loadAll();
    } catch (e) {
      pushToast(getErrorMessage(e, "Top-up failed."), "error");
    }
  }

  function handleNavigateToWallet(suggested?: number) {
    setWalletTopUpSuggestion(suggested);
    setView("wallet");
  }

  function goToTasksFiltered(filter: TaskFilter, status: StatusFilter = null) {
    setStatusFilter(status);
    setTaskFilter(filter);
    goTo("tasks");
  }

  async function handleRatingSubmit(stars: number, comment: string) {
    if (!ratingTaskId) return;
    try {
      await apiSubmitRating(ratingTaskId, stars, comment);
      setRatingTaskId(null);
      pushToast("Thanks for the feedback!", "success");
      await loadAll();
    } catch (e) {
      pushToast(getErrorMessage(e, "Couldn't save your rating."), "error");
    }
  }

  async function handleSaveProfile(next: CustomerProfile) {
    try {
      await apiUpdateCustomerProfile({
        name: next.name, surname: next.surname, phone: next.phone, email: next.email,
        notifyTaskUpdates: next.notifyTaskUpdates, notifyPromotions: next.notifyPromotions,
      });
      setProfile(next);
      pushToast("Settings saved.", "success");
    } catch (e) {
      pushToast(getErrorMessage(e, "Couldn't save settings."), "error");
    }
  }

  async function handleSaveLocation(loc: SavedLocation) {
    if (savedLocations.some((l) => l.label.toLowerCase() === loc.label.toLowerCase())) return;
    try {
      await apiSaveLocation(loc.label, loc.address);
      setSavedLocations((prev) => [...prev, loc]);
      pushToast(`Saved "${loc.label}" for next time.`, "success");
    } catch (e) {
      pushToast(getErrorMessage(e, "Couldn't save that location."), "error");
    }
  }

  function handleViewTaskFromTransaction(taskId: string) {
    if (tasks.some((t) => t.id === taskId)) {
      openTask(taskId);
    } else {
      pushToast("That task is no longer in your history.", "info");
    }
  }

  function handleNotifSelect(n: NotificationItem) {
    setNotifPanelOpen(false);
    if (n.taskId && tasks.some((t) => t.id === n.taskId)) openTask(n.taskId);
  }

  function toggleNotifPanel() {
    setNotifPanelOpen((open) => {
      if (!open) setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      return !open;
    });
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
        <div className="flex items-center gap-2">
          <NotificationBell
            light
            notifications={notifications}
            unreadCount={unreadCount}
            open={notifPanelOpen}
            onToggle={toggleNotifPanel}
            onClose={() => setNotifPanelOpen(false)}
            onSelect={handleNotifSelect}
            now={now}
          />
          <button onClick={() => goTo("wallet")} className="text-[12.5px] font-semibold bg-white/10 px-2.5 py-1.5 rounded-full">
            R{balance.toFixed(0)}
          </button>
        </div>
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
      <div className="md:flex md:flex-col md:min-h-screen md:min-w-0">
        {/* Desktop utility bar — persistent quick actions, reachable from every view */}
        <div className="hidden md:flex items-center justify-end gap-2.5 px-9 pt-5">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            open={notifPanelOpen}
            onToggle={toggleNotifPanel}
            onClose={() => setNotifPanelOpen(false)}
            onSelect={handleNotifSelect}
            now={now}
          />
          {view !== "post" && (
            <button onClick={startPostTask} className="inline-flex items-center gap-1.5 bg-coral text-white hover:bg-coral-dark rounded-full font-semibold px-5 py-2.5 text-[13.5px]">
              <IconPlus className="w-4 h-4" /> Post a task
            </button>
          )}
        </div>

        <main className="px-4 sm:px-6 md:px-9 py-6 md:py-5 pb-24 md:pb-9 md:flex-1">
          {view === "overview" && (
            <>
              <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl">Good to see you, {profile.name.split(" ")[0]}</h1>
                  <p className="text-ink-soft text-[13px] sm:text-[13.5px] mt-1">
                    {activeTasks.length} task{activeTasks.length === 1 ? "" : "s"} on the go right now
                  </p>
                </div>
              </div>

              {tasks.length > 0 && balance < 100 && (
                <div className="flex items-center gap-3 bg-[#fff4e0] text-[#a86a1a] p-3.5 rounded-xl mb-5 flex-wrap">
                  <IconAlert className="w-4 h-4 flex-shrink-0" />
                  <p className="text-[13px] flex-1 min-w-[180px]">Your wallet balance is low — top up to keep accepting quotes without interruption.</p>
                  <button onClick={() => handleNavigateToWallet()} className="text-[12.5px] font-semibold underline">Top up</button>
                </div>
              )}

              {tasks.length === 0 ? (
                <EmptyState onPost={startPostTask} />
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-7">
                    <StatCard
                      label="Active tasks"
                      value={String(activeTasks.length)}
                      icon={<IconPackage className="w-[17px] h-[17px] text-indigo-600" />}
                      iconBg="#eeeefc"
                      onClick={() => goToTasksFiltered("active")}
                    />
                    <StatCard
                      label="Awaiting confirmation"
                      value={String(needsConfirmation.length)}
                      icon={<IconClock className="w-[17px] h-[17px] text-coral-dark" />}
                      iconBg="#fff2ea"
                      onClick={() => goToTasksFiltered("all", "awaiting_confirmation")}
                    />
                    <StatCard
                      label="Overdue"
                      value={String(overdueTasks.length)}
                      icon={<IconAlert className="w-[17px] h-[17px] text-[#d64545]" />}
                      iconBg="#fdeaea"
                      warn={overdueTasks.length > 0}
                      onClick={() => goToTasksFiltered("all", "overdue")}
                    />
                    <StatCard
                      label="In escrow"
                      value={`R${held}`}
                      icon={<IconWallet className="w-[17px] h-[17px] text-[#1f9d5c]" />}
                      iconBg="#e9faf1"
                      onClick={() => goTo("wallet")}
                    />
                  </div>

                  <div className="bg-white rounded-2xl border border-line overflow-hidden">
                    <div className="flex justify-between items-center px-5 py-4 border-b border-line">
                      <h3 className="text-[15.5px]">Recent tasks</h3>
                      <button onClick={() => goTo("tasks")} className="text-[13px] text-indigo-600 font-semibold">View all →</button>
                    </div>
                    {tasks.slice(0, 4).map((t) => (
                      <TaskRow key={t.id} task={t} now={now} onClick={() => openTask(t.id)} onQuickApprove={() => approveTask(t.id)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {view === "post" && (
            <PostTaskForm
              mode={editingTask ? "edit" : "create"}
              initialTask={editingTask ?? duplicateSeed ?? undefined}
              savedLocations={savedLocations}
              onSaveLocation={handleSaveLocation}
              onSubmit={handlePostSubmit}
              onCancel={handlePostCancel}
            />
          )}

          {view === "tasks" && (
            <>
              <div className="flex justify-between items-center flex-wrap gap-4 mb-5">
                <h1 className="text-xl sm:text-2xl">My tasks</h1>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <div className="flex bg-white border border-line p-1 rounded-full w-fit">
                  {(["all", "active", "closed"] as TaskFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setStatusFilter(null);
                        setTaskFilter(f);
                      }}
                      className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition ${
                        !statusFilter && taskFilter === f ? "bg-indigo-950 text-white" : "text-ink-soft hover:text-indigo-600"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 min-w-[160px] max-w-[280px]">
                  <IconSearch className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search by title or ID"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-line rounded-full text-[13px] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  value={taskSort}
                  onChange={(e) => setTaskSort(e.target.value as TaskSort)}
                  className="bg-white border border-line rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-soft focus:outline-none focus:border-indigo-500 w-fit"
                >
                  <option value="newest">Newest first</option>
                  <option value="deadline">By deadline</option>
                </select>
              </div>

              {statusFilter && (
                <div className="flex items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 bg-lavender-100 text-indigo-700 text-[12.5px] font-semibold px-3 py-1.5 rounded-full">
                    Showing: {statusFilter === "overdue" ? "Overdue" : "Awaiting confirmation"}
                    <button onClick={() => setStatusFilter(null)} aria-label="Clear filter" className="hover:text-indigo-900">✕</button>
                  </span>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-line overflow-hidden mt-2">
                {tasks.length === 0 ? (
                  <div className="p-6"><EmptyState onPost={startPostTask} compact /></div>
                ) : filteredTasks.length === 0 ? (
                  <p className="p-6 text-[13.5px] text-ink-soft">No tasks match that search.</p>
                ) : (
                  filteredTasks.map((t) => <TaskRow key={t.id} task={t} now={now} onClick={() => openTask(t.id)} onQuickApprove={() => approveTask(t.id)} />)
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
              onApprove={() => approveTask(activeTask.id)}
              onFund={() => fundTaskHandler(activeTask.id)}
              onOpenRating={() => setRatingTaskId(activeTask.id)}
              onEdit={() => startEditTask(activeTask.id)}
              onDelete={() => handleDeleteTask(activeTask.id)}
              onDuplicate={() => startDuplicateTask(activeTask)}
              onNavigateToWallet={handleNavigateToWallet}
              onToast={pushToast}
            />
          )}

          {view === "wallet" && (
            <WalletPanel
              balance={balance}
              held={held}
              transactions={transactions}
              onTopUp={handleTopUp}
              suggestedTopUp={walletTopUpSuggestion}
              onViewTask={handleViewTaskFromTransaction}
            />
          )}

          {view === "settings" && <SettingsPanel profile={profile} onSave={handleSaveProfile} />}
        </main>
      </div>

      {/* Mobile bottom tab bar — Post sits centered as a normal tab (not a floating
          button) so it never overlaps list content, toasts, or form actions. Its own
          order here (Post centered) is deliberately different from the sidebar's
          order, which keeps "Post a task" near the top as the first action. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-line flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {(["overview", "tasks", "post", "wallet", "settings"] as View[]).map((key) => {
          const n = navItems.find((item) => item.key === key)!;
          const Icon = n.icon;
          const active = view === n.key || (n.key === "tasks" && view === "task-detail");
          const isPost = n.key === "post";
          const label = n.label === "My tasks" ? "Tasks" : n.label === "Post a task" ? "Post" : n.label;
          return (
            <button
              key={n.key}
              onClick={() => goTo(n.key)}
              aria-label={n.label}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition ${
                isPost
                  ? active
                    ? "text-coral-dark font-semibold"
                    : "text-ink-soft"
                  : active
                  ? "text-indigo-600"
                  : "text-ink-soft"
              }`}
            >
              {isPost ? (
                <span
                  className={`w-7 h-7 -mt-1 rounded-full flex items-center justify-center transition ${
                    active ? "bg-coral text-white" : "border-[1.5px] border-coral text-coral-dark bg-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              {label}
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

function StatCard({
  label,
  value,
  icon,
  iconBg,
  warn = false,
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  warn?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white rounded-2xl p-4 sm:p-5 border transition hover:border-indigo-300 hover:shadow-sm2 active:scale-[0.98] ${
        warn ? "border-[#f3c5c5]" : "border-line"
      }`}
    >
      <div className="flex justify-between items-start mb-3 sm:mb-3.5">
        <span className="text-[11px] sm:text-xs font-semibold text-ink-soft leading-tight pr-1">{label}</span>
        <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <h3 className="text-[22px] sm:text-[27px]">{value}</h3>
    </button>
  );
}

function TaskRow({ task, now, onClick, onQuickApprove }: { task: CustomerTask; now: number; onClick: () => void; onQuickApprove: () => void }) {
  const Icon = categoryIcons[task.category];
  const overdue = !CLOSED_STATUSES.includes(task.status) && new Date(task.deadline).getTime() < now;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 px-4 sm:px-5 py-4 border-b border-line last:border-b-0 w-full text-left hover:bg-paper transition cursor-pointer"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-lavender-100 flex items-center justify-center flex-shrink-0">
          {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold leading-snug break-words">{task.title}</p>
          <p className="text-[12px] text-ink-soft font-mono mt-0.5 whitespace-nowrap">#{task.id} · {formatRelativeTime(task.createdAt, now)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 pl-12 sm:pl-0">
        {overdue && <IconAlert className="w-4 h-4 text-[#d64545] flex-shrink-0" />}
        {task.status === "awaiting_confirmation" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickApprove();
            }}
            className="inline-flex items-center bg-indigo-950 text-white text-[11.5px] font-semibold px-3 py-1.5 rounded-full hover:bg-indigo-900 flex-shrink-0"
          >
            Confirm
          </button>
        )}
        <CustomerStatusBadge status={task.status} />
      </div>
    </div>
  );
}

function NotificationBell({
  light = false,
  notifications,
  unreadCount,
  open,
  onToggle,
  onClose,
  onSelect,
  now,
}: {
  light?: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (n: NotificationItem) => void;
  now: number;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-label="Notifications"
        className={`relative w-9 h-9 rounded-full flex items-center justify-center ${light ? "text-white hover:bg-white/10" : "text-ink-soft border border-line hover:border-indigo-400 hover:text-indigo-600 bg-white"}`}
      >
        <IconBell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-coral text-white text-[9.5px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute right-0 mt-2 w-[300px] max-w-[85vw] bg-white rounded-2xl border border-line shadow-lg2 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-line">
              <h4 className="text-[13.5px] font-semibold">Notifications</h4>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-[13px] text-ink-soft">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onSelect(n)}
                    className="flex items-start gap-2.5 w-full text-left px-4 py-3 border-b border-line last:border-b-0 hover:bg-paper"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.read ? "bg-transparent" : "bg-coral"}`} />
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-ink leading-snug">{n.text}</p>
                      <p className="text-[11px] text-ink-soft mt-0.5">{formatRelativeTime(n.at, now)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
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