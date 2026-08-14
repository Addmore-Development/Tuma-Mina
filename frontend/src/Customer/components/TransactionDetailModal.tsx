import { useEffect } from "react";
import Button from "../../components/Button";
import type { WalletTransaction } from "../../types/types";
import { IconClose, IconWallet } from "../icons";

const TYPE_LABEL: Record<WalletTransaction["type"], string> = {
  hold: "Held in escrow",
  release: "Released to runner",
  topup: "Wallet top-up",
  refund: "Refund",
};

interface TransactionDetailModalProps {
  transaction: WalletTransaction;
  onViewTask?: (taskId: string) => void;
  onClose: () => void;
}

export default function TransactionDetailModal({ transaction, onViewTask, onClose }: TransactionDetailModalProps) {
  const isCredit = transaction.type === "topup" || transaction.type === "refund";

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-indigo-950/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-lg2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-full bg-lavender-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <IconWallet className="w-5 h-5" />
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink"><IconClose className="w-5 h-5" /></button>
        </div>

        <h3 className="text-[18px] mb-0.5">{TYPE_LABEL[transaction.type]}</h3>
        <p className={`text-[26px] font-bold mb-5 ${isCredit ? "text-[#1f9d5c]" : "text-ink"}`}>
          {isCredit ? "+" : "-"}R{transaction.amount.toFixed(2)}
        </p>

        <div className="flex flex-col gap-2.5 text-[13.5px] mb-6">
          <DetailRow label="Description" value={transaction.description} />
          <DetailRow label="Date" value={new Date(transaction.date).toLocaleString()} />
          {transaction.taskId && <DetailRow label="Related task" value={`#${transaction.taskId}`} />}
        </div>

        {transaction.taskId && onViewTask ? (
          <Button
            block
            onClick={() => {
              onViewTask(transaction.taskId!);
              onClose();
            }}
          >
            View task
          </Button>
        ) : (
          <Button block variant="ghost" onClick={onClose}>Close</Button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
