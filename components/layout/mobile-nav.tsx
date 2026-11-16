"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Film,
  Image as ImageIcon,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_ITEMS = [
  { name: "Tạo", href: "/create", icon: Sparkles },
  { name: "Thư viện", href: "/gallery", icon: ImageIcon },
  { name: "Yêu thích", href: "/favorites", icon: Star },
  { name: "Chi phí", href: "/usage", icon: BarChart3 },
  { name: "Cài đặt", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-[#0a0c14]/90 px-4 py-3 backdrop-blur-md">
        <Link href="/create" className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600">
            <Film className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white">Veo3 Studio</span>
        </Link>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zinc-800 bg-[#0a0c14]/95 py-2 backdrop-blur-lg">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors",
                isActive ? "text-purple-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-0.5", isActive && "stroke-[2.5]")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
