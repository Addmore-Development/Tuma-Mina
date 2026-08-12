import Button from "../../components/Button";
import { IconAlert, IconClose } from "../icons";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({ title, description, confirmLabel, tone = "default", onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tone === "danger" ? "bg-[#fdeaea] text-[#a83232]" : "bg-lavender-100 text-indigo-600"}`}>
            <IconAlert className="w-5 h-5" />
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink"><IconClose className="w-5 h-5" /></button>
        </div>
        <h3 className="text-[18px] mb-1.5">{title}</h3>
        <p className="text-[13.5px] text-ink-soft mb-6 leading-relaxed">{description}</p>
        <div className="flex gap-3">
          <Button variant="ghost" block onClick={onClose}>Never mind</Button>
          <Button
            block
            onClick={onConfirm}
            className={tone === "danger" ? "!bg-[#d64545] hover:!bg-[#a83232]" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
