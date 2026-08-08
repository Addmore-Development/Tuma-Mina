import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "ghostLight" | "dark";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-coral text-white hover:bg-coral-dark",
  ghost: "bg-transparent text-ink border border-line hover:border-indigo-500 hover:text-indigo-600",
  ghostLight:
    "bg-transparent text-white border border-white/25 hover:border-white/50",
  dark: "bg-indigo-950 text-white hover:bg-indigo-900",
};

const sizeClasses: Record<Size, string> = {
  md: "px-[22px] py-[11px] text-[14.5px]",
  lg: "px-7 py-[15px] text-[15.5px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold
        transition-transform active:scale-[0.97] ${variantClasses[variant]} ${sizeClasses[size]}
        ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}