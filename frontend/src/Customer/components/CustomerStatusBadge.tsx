import type { CustomerTaskStatus } from "../../types/types";

const config: Record<CustomerTaskStatus, { label: string; classes: string; dot: string }> = {
  posted: { label: "Waiting for a runner", classes: "bg-lavender-100 text-indigo-600", dot: "bg-indigo-600" },
  accepted: { label: "Runner confirmed", classes: "bg-[#fff2ea] text-coral-dark", dot: "bg-coral-dark" },
  in_progress: { label: "In progress", classes: "bg-[#fff2ea] text-coral-dark", dot: "bg-coral-dark" },
  awaiting_confirmation: { label: "Awaiting your confirmation", classes: "bg-lavender-100 text-indigo-600", dot: "bg-indigo-600" },
  completed: { label: "Completed", classes: "bg-[#e9faf1] text-[#1f9d5c]", dot: "bg-brand-green" },
  disputed: { label: "Disputed", classes: "bg-[#fdeaea] text-[#d64545]", dot: "bg-[#d64545]" },
  cancelled: { label: "Cancelled", classes: "bg-[#f1f1f5] text-ink-soft", dot: "bg-ink-soft" },
};

export default function CustomerStatusBadge({ status }: { status: CustomerTaskStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[11.5px] font-semibold whitespace-nowrap ${c.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}
