"use client";

import { PRESET_AVATARS } from "@/modules/settings/constants";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-xl",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

export function UserAvatar({
  name,
  image,
  size = "md",
  className,
}: UserAvatarProps) {
  const sizeClass = SIZE_MAP[size];

  if (image && !image.startsWith("preset:")) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={image}
        alt={name}
        className={cn(
          "rounded-full object-cover ring-2 ring-white/40 shrink-0",
          sizeClass,
          className
        )}
      />
    );
  }

  const preset = PRESET_AVATARS.find((p) => p.id === image);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold shrink-0",
        sizeClass,
        preset ? preset.bgClass : "bg-[#EAF2FF] text-[#2563EB]",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

