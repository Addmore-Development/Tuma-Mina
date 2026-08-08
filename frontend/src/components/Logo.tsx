interface LogoProps {
  light?: boolean;
  className?: string;
}

export default function Logo({ light = false, className = "" }: LogoProps) {
  return (
    <div
      className={`flex items-center gap-2 font-display font-bold text-xl ${
        light ? "text-white" : "text-ink"
      } ${className}`}
    >
      <svg className="w-[22px] h-[22px] flex-shrink-0 fill-coral" viewBox="0 0 24 24">
        <path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9zm0 12.5A3.5 3.5 0 1 1 12 5.5a3.5 3.5 0 0 1 0 7z" />
      </svg>
      Tuma Mina
    </div>
  );
}