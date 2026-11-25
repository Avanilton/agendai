import { cn } from "@/lib/utils";

interface AgendaiLogoProps {
  variant?: "horizontal" | "symbol";
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconSizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

const textSizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function AgendaiSymbol({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn("h-9 w-9 shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="agendai-mark-grad"
          x1="8"
          y1="6"
          x2="58"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#142B4F" />
        </linearGradient>
      </defs>
      <rect x="4" y="8" width="56" height="52" rx="14" fill="url(#agendai-mark-grad)" />
      <rect x="18" y="3" width="6" height="12" rx="3" fill="#FF914D" />
      <rect x="40" y="3" width="6" height="12" rx="3" fill="#FF914D" />
      <path
        d="M12 24H52"
        stroke="#EAF2FF"
        strokeOpacity="0.3"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M21 38.5L28.5 46L44 30.5"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="46" cy="45" r="5" fill="#FF914D" />
    </svg>
  );
}

export function AgendaiLogo({
  variant = "horizontal",
  theme = "light",
  size = "md",
  className,
}: AgendaiLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 select-none", className)}
      aria-label="Agendai"
    >
      <AgendaiSymbol className={iconSizes[size]} />
      {variant === "horizontal" && (
        <span
          className={cn(
            "font-extrabold tracking-tight leading-none",
            textSizes[size],
            theme === "dark" ? "text-white" : "text-[#142B4F]"
          )}
        >
          Agend
          <span className={theme === "dark" ? "text-[#FF914D]" : "text-[#2563EB]"}>
            ai
          </span>
        </span>
      )}
    </span>
  );
}

