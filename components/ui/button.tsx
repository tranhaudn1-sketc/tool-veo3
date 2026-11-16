import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "gradient";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50 select-none",
          {
            "bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-600/20 active:scale-[0.98]":
              variant === "default",
            "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:opacity-95 shadow-lg shadow-purple-600/25 active:scale-[0.98]":
              variant === "gradient",
            "bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700 active:scale-[0.98]":
              variant === "secondary",
            "border border-zinc-700/80 bg-transparent text-zinc-200 hover:bg-zinc-800/60 active:scale-[0.98]":
              variant === "outline",
            "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50":
              variant === "ghost",
            "bg-red-600/80 text-white hover:bg-red-500 active:scale-[0.98]":
              variant === "destructive",
          },
          {
            "h-10 px-4 py-2 text-sm rounded-xl": size === "default",
            "h-8 px-3 text-xs rounded-lg": size === "sm",
            "h-12 px-6 text-base rounded-2xl": size === "lg",
            "h-10 w-10 p-0 rounded-xl": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
