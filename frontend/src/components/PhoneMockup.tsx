import type { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
  tilt?: "left" | "right" | "none";
}

const tiltClasses: Record<NonNullable<PhoneMockupProps["tilt"]>, string> = {
  left: "translate-y-7 -rotate-6 -mr-11 z-10",
  right: "translate-y-8 rotate-6 -ml-11 z-10",
  none: "-translate-y-1.5 z-20",
};

export default function PhoneMockup({ children, tilt = "none" }: PhoneMockupProps) {
  return (
    <div
      className={`relative w-[220px] h-[460px] flex-shrink-0 bg-[#0c0e26] rounded-[34px]
        border-[6px] border-[#05061a] shadow-lg2 overflow-hidden ${tiltClasses[tilt]}`}
    >
      <div className="absolute inset-0 rounded-[28px] overflow-hidden bg-indigo-950 p-3.5 flex flex-col gap-2.5 text-white">
        {children}
      </div>
    </div>
  );
}

export function PhoneCard({
  tag,
  title,
  body,
  status,
}: {
  tag: string;
  title: string;
  body: string;
  status?: string;
}) {
  return (
    <div className="bg-white/10 border border-white/15 rounded-[14px] p-[11px] backdrop-blur-sm">
      <span className="block font-mono text-[9px] uppercase tracking-wide text-coral mb-1.5">
        {tag}
      </span>
      <h5 className="text-[12.5px] font-semibold mb-1">{title}</h5>
      <p className="text-[10px] text-indigo-100 leading-relaxed">{body}</p>
      {status && (
        <div className="flex items-center gap-1.5 mt-2 text-[9.5px] font-semibold text-brand-green">
          <span className="w-[5px] h-[5px] rounded-full bg-brand-green" />
          {status}
        </div>
      )}
    </div>
  );
}