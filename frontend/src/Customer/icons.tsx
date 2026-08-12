// Small line-icon set for the Customer area.
// Kept in the same style as the icons on Landing.tsx (stroke, currentColor, 1.8 weight)
// so anything drawn here matches the rest of the product without extra dependencies.

type IconProps = { className?: string };

export const IconPackage = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7.5l9-4 9 4-9 4-9-4z" />
    <path d="M3 7.5v9l9 4 9-4v-9" />
    <path d="M12 11.5v9" />
  </svg>
);

export const IconDocument = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="6" y="3" width="12" height="18" rx="1.5" />
    <path d="M9 8h6M9 12h6M9 16h3.5" />
  </svg>
);

export const IconClock = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3.2 2" />
  </svg>
);

export const IconCart = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="17.5" cy="20" r="1.4" />
    <path d="M2.5 3h2l2.3 11.4a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L20.5 7H6" />
  </svg>
);

export const IconPin = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 21s7-6.7 7-12a7 7 0 1 0-14 0c0 5.3 7 12 7 12z" />
    <circle cx="12" cy="9" r="2.4" />
  </svg>
);

export const IconEdit = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.7 3.7l3.6 3.6L7.5 20.1l-4.4.8.8-4.4z" />
  </svg>
);

export const IconCamera = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 8h3l1.6-2.4h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z" />
    <circle cx="12" cy="13.2" r="3.4" />
  </svg>
);

export const IconWallet = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2.5" y="6" width="19" height="13" rx="2" />
    <path d="M2.5 10h19" />
    <circle cx="17" cy="14" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCheck = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconAlert = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </svg>
);

export const IconStar = ({ className = "", filled = false }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className}>
    <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.4l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3.5z" />
  </svg>
);

export const IconArrowRight = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconSearch = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

export const IconClose = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconMenu = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconTrash = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
  </svg>
);

export const IconPlus = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconChevronDown = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconUser = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20.5c1.4-3.8 4.5-5.7 7.5-5.7s6.1 1.9 7.5 5.7" />
  </svg>
);

export const IconGrid = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.4" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.4" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.4" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.4" />
  </svg>
);

export const IconBell = ({ className = "" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);
