import { useState, type FormEvent } from "react";
import Button from "../../components/Button";
import type { WalletTransaction } from "../../types/types";
import { IconWallet } from "../icons";
import { useNow } from "../useNow";
import { formatRelativeTime } from "../formatRelativeTime";

const QUICK_AMOUNTS = [100, 250, 500];

interface WalletPanelProps {
  balance: number;
  held: number;
  transactions: WalletTransaction[];
  onTopUp: (amount: number) => void;
  suggestedTopUp?: number;
}

export default function WalletPanel({ balance, held, transactions, onTopUp, suggestedTopUp }: WalletPanelProps) {
  const now = useNow();
  const [showTopUp, setShowTopUp] = useState(!!suggestedTopUp);
  const [amount, setAmount] = useState(suggestedTopUp ? String(Math.ceil(suggestedTopUp)) : "");
  const [error, setError] = useState("");

  // Re-open (and prefill) the top-up form whenever a fresh suggestion comes in — e.g. from
  // an insufficient-funds prompt elsewhere. Adjusting state during render like this (rather
  // than in an effect) is the pattern React recommends for "reset state when a prop changes".
  const [lastSuggested, setLastSuggested] = useState(suggestedTopUp);
  if (suggestedTopUp !== lastSuggested) {
    setLastSuggested(suggestedTopUp);
    if (suggestedTopUp) {
      setShowTopUp(true);
      setAmount(String(Math.ceil(suggestedTopUp)));
    }
  }

  function submitTopUp(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than R0.");
      return;
    }
    // TODO: hand off to the real payment provider, then POST /api/wallet/topup
    // once it confirms — this just credits the mock balance directly.
    onTopUp(value);
    setAmount("");
    setError("");
    setShowTopUp(false);
  }

  return (
    <div className="max-w-[720px]">
      <h1 className="text-2xl mb-1.5">Wallet</h1>
      <p className="text-ink-soft text-[13.5px] sm:text-[14px] mb-6 sm:mb-7">Funds are held here in escrow when a task starts, and released to the runner once you confirm.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-950 text-white rounded-2xl p-5">
          <p className="text-[12px] text-white/60 mb-1 flex items-center gap-1.5"><IconWallet className="w-4 h-4" /> Available balance</p>
          <p className="text-[26px] sm:text-[28px] font-bold mb-4">R{balance.toFixed(2)}</p>
          <Button size="md" variant="ghostLight" onClick={() => setShowTopUp((v) => !v)}>Add funds</Button>
        </div>
        <div className="bg-lavender-100 rounded-2xl p-5">
          <p className="text-[12px] text-ink-soft mb-1">Held in escrow</p>
          <p className="text-[26px] sm:text-[28px] font-bold text-indigo-950 mb-4">R{held.toFixed(2)}</p>
          <p className="text-[12.5px] text-ink-soft">Released automatically once you approve a task, or after 72 hours.</p>
        </div>
      </div>

      {showTopUp && (
        <form onSubmit={submitTopUp} className="mb-8 p-4 border-[1.5px] border-line rounded-xl w-full sm:w-fit">
          <label className="block text-[13px] font-semibold mb-1.5">Amount to add</label>
          <div className="flex flex-wrap items-start gap-2.5">
            <div>
              <input
                type="number"
                min={1}
                autoFocus
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                placeholder="R  amount"
                className={`w-[160px] px-[15px] py-2.5 border-[1.5px] rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500 ${error ? "border-[#d64545]" : "border-line"}`}
              />
              {error && <p className="text-[12px] text-[#d64545] mt-1">{error}</p>}
            </div>
            <Button type="submit" size="md">Add</Button>
          </div>
          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="px-3 py-1.5 rounded-full border border-line text-[12.5px] font-medium text-ink-soft hover:border-indigo-400 hover:text-indigo-600"
              >
                R{v}
              </button>
            ))}
          </div>
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
              <div key={t.id} className="flex items-center justify-between p-3.5 border-[1.5px] border-line rounded-xl gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium truncate">{t.description}</p>
                  <p className="text-[12px] text-ink-soft">{formatRelativeTime(t.date, now)}</p>
                </div>
                <span
                  className={`text-[14.5px] font-bold flex-shrink-0 ${
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
