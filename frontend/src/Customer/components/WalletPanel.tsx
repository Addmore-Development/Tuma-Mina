import { useState, type FormEvent } from "react";
import Button from "../../components/Button";
import type { WalletTransaction } from "../../types/types";
import { IconWallet } from "../icons";

interface WalletPanelProps {
  balance: number;
  held: number;
  transactions: WalletTransaction[];
  onTopUp: (amount: number) => void;
}

export default function WalletPanel({ balance, held, transactions, onTopUp }: WalletPanelProps) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState("");

  function submitTopUp(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;
    // TODO: hand off to the real payment provider, then POST /api/wallet/topup
    // once it confirms — this just credits the mock balance directly.
    onTopUp(value);
    setAmount("");
    setShowTopUp(false);
  }

  return (
    <div className="max-w-[720px]">
      <h2 className="text-[24px] mb-1.5">Wallet</h2>
      <p className="text-ink-soft text-[14px] mb-7">Funds are held here in escrow when a task starts, and released to the runner once you confirm.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-indigo-950 text-white rounded-2xl p-5">
          <p className="text-[12px] text-white/60 mb-1 flex items-center gap-1.5"><IconWallet className="w-4 h-4" /> Available balance</p>
          <p className="text-[28px] font-bold mb-4">R{balance.toFixed(2)}</p>
          <Button size="md" variant="ghostLight" onClick={() => setShowTopUp((v) => !v)}>Add funds</Button>
        </div>
        <div className="bg-lavender-100 rounded-2xl p-5">
          <p className="text-[12px] text-ink-soft mb-1">Held in escrow</p>
          <p className="text-[28px] font-bold text-indigo-950 mb-4">R{held.toFixed(2)}</p>
          <p className="text-[12.5px] text-ink-soft">Released automatically once you approve a task, or after 72 hours.</p>
        </div>
      </div>

      {showTopUp && (
        <form onSubmit={submitTopUp} className="flex items-end gap-3 mb-8 p-4 border-[1.5px] border-line rounded-xl w-fit">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5">Amount to add</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R  amount"
              className="w-[160px] px-[15px] py-2.5 border-[1.5px] border-line rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>
          <Button type="submit" size="md">Add</Button>
        </form>
      )}

      <h3 className="text-[13px] font-semibold mb-2.5">Transaction history</h3>
      {transactions.length === 0 ? (
        <p className="text-[13.5px] text-ink-soft">No transactions yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions
            .slice()
            .reverse()
            .map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3.5 border-[1.5px] border-line rounded-xl">
                <div>
                  <p className="text-[13.5px] font-medium">{t.description}</p>
                  <p className="text-[12px] text-ink-soft">{new Date(t.date).toLocaleString()}</p>
                </div>
                <span
                  className={`text-[14.5px] font-bold ${
                    t.type === "topup" || t.type === "refund" ? "text-[#1f9d5c]" : "text-ink"
                  }`}
                >
                  {t.type === "topup" || t.type === "refund" ? "+" : "-"}R{t.amount.toFixed(2)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
