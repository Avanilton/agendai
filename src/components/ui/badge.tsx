import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#EAF2FF] text-[#2563EB]",
        orange: "bg-[#FFF0E5] text-[#C2410C]",
        solidOrange: "bg-[#FF914D] text-[#142B4F]",
        dark: "bg-[#142B4F] text-white",
        outline: "border border-slate-200 text-[#64748B] bg-white",
        success: "bg-emerald-50 text-emerald-700",
        destructive: "bg-red-50 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

