import type { JobStatus } from "../types";

const config: Record<JobStatus, { label: string; classes: string; dot: string }> = {
  en_route: { label: "En route", classes: "bg-[#fff2ea] text-coral-dark", dot: "bg-coral-dark" },
  in_queue: { label: "In queue", classes: "bg-[#fff2ea] text-coral-dark", dot: "bg-coral-dark" },
  awaiting_pin: { label: "Awaiting PIN", classes: "bg-lavender-100 text-indigo-600", dot: "bg-indigo-600" },
  flagged: { label: "Flagged", classes: "bg-[#fdeaea] text-[#d64545]", dot: "bg-[#d64545]" },
  delivered: { label: "Delivered", classes: "bg-[#e9faf1] text-[#1f9d5c]", dot: "bg-brand-green" },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-[11.5px] font-semibold ${c.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}