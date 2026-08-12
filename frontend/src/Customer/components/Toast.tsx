import { useEffect } from "react";
import { IconAlert, IconCheck, IconClose } from "../icons";

export interface ToastMessage {
  id: string;
  text: string;
  tone: "success" | "error" | "info";
}

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const toneStyles: Record<ToastMessage["tone"], string> = {
  success: "bg-indigo-950 text-white",
  error: "bg-[#a83232] text-white",
  info: "bg-white text-ink border border-line",
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3800);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg2 text-[13.5px] font-medium min-w-[220px] max-w-[360px] ${toneStyles[toast.tone]}`}>
      {toast.tone === "success" && <IconCheck className="w-4 h-4 flex-shrink-0" />}
      {toast.tone === "error" && <IconAlert className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{toast.text}</span>
      <button onClick={() => onDismiss(toast.id)} className="opacity-70 hover:opacity-100 flex-shrink-0">
        <IconClose className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed z-[60] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 flex flex-col gap-2.5 items-center md:items-end px-4 md:px-0 w-full md:w-auto">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
