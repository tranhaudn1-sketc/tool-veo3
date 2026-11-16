import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "purple";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        {
          "bg-zinc-800 text-zinc-300 border border-zinc-700/60": variant === "default",
          "bg-zinc-800/60 text-zinc-400": variant === "secondary",
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20":
            variant === "success",
          "bg-amber-500/10 text-amber-400 border border-amber-500/20":
            variant === "warning",
          "bg-rose-500/10 text-rose-400 border border-rose-500/20":
            variant === "destructive",
          "bg-purple-500/15 text-purple-300 border border-purple-500/30":
            variant === "purple",
        },
        className
      )}
      {...props}
    />
  );
}
