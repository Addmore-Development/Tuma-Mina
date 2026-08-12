import { useState, type FormEvent } from "react";
import Button from "../../components/Button";
import type { CustomerProfile } from "../../types/types";
import { IconBell, IconUser } from "../icons";

interface SettingsPanelProps {
  profile: CustomerProfile;
  onSave: (profile: CustomerProfile) => void;
}

export default function SettingsPanel({ profile, onSave }: SettingsPanelProps) {
  const [draft, setDraft] = useState<CustomerProfile>(profile);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!draft.name.trim()) nextErrors.name = "Please enter your name.";
    if (!/^[\d+\s]{7,}$/.test(draft.phone.trim())) nextErrors.phone = "Enter a valid phone number.";
    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) nextErrors.email = "Enter a valid email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // TODO: PATCH /api/customer/profile
    onSave(draft);
  }

  return (
    <div className="max-w-[560px]">
      <h1 className="text-2xl mb-1.5">Settings</h1>
      <p className="text-ink-soft text-[13.5px] mb-7">Keep your details up to date so runners and support can reach you.</p>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-line p-5 mb-5">
          <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2"><IconUser className="w-4 h-4 text-indigo-600" /> Profile</h3>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold mb-1.5">Full name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={`w-full px-[15px] py-3 border-[1.5px] rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500 ${errors.name ? "border-[#d64545]" : "border-line"}`}
            />
            {errors.name && <p className="text-[12px] text-[#d64545] mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Phone number</label>
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className={`w-full px-[15px] py-3 border-[1.5px] rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500 ${errors.phone ? "border-[#d64545]" : "border-line"}`}
              />
              {errors.phone && <p className="text-[12px] text-[#d64545] mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Email</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className={`w-full px-[15px] py-3 border-[1.5px] rounded-xl text-[14.5px] focus:outline-none focus:border-indigo-500 ${errors.email ? "border-[#d64545]" : "border-line"}`}
              />
              {errors.email && <p className="text-[12px] text-[#d64545] mt-1">{errors.email}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5 mb-6">
          <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2"><IconBell className="w-4 h-4 text-indigo-600" /> Notifications</h3>

          <label className="flex items-center justify-between py-2.5 cursor-pointer">
            <div>
              <p className="text-[13.5px] font-medium">Task updates</p>
              <p className="text-[12px] text-ink-soft">Quotes, delivery proof, and confirmations.</p>
            </div>
            <Toggle checked={draft.notifyTaskUpdates} onChange={(v) => setDraft({ ...draft, notifyTaskUpdates: v })} />
          </label>
          <div className="h-px bg-line my-1" />
          <label className="flex items-center justify-between py-2.5 cursor-pointer">
            <div>
              <p className="text-[13.5px] font-medium">Offers &amp; promotions</p>
              <p className="text-[12px] text-ink-soft">Occasional news about Tuma-Mina.</p>
            </div>
            <Toggle checked={draft.notifyPromotions} onChange={(v) => setDraft({ ...draft, notifyPromotions: v })} />
          </label>
        </div>

        <Button type="submit" size="lg">Save changes</Button>
      </form>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full flex-shrink-0 relative transition-colors ${checked ? "bg-coral" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm2 transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}
