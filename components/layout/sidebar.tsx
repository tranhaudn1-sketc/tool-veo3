"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Film,
  Image as ImageIcon,
  LogOut,
  Settings,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    name: "Tạo tác phẩm",
    href: "/create",
    icon: Sparkles,
  },
  {
    name: "Thư viện",
    href: "/gallery",
    icon: ImageIcon,
  },
  {
    name: "Yêu thích",
    href: "/favorites",
    icon: Star,
  },
  {
    name: "Chi phí & Thống kê",
    href: "/usage",
    icon: BarChart3,
  },
  {
    name: "Cài đặt hệ thống",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Đã đăng xuất thành công.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Không thể đăng xuất.");
    }
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-zinc-800/80 bg-[#0a0c14]/90 p-4 backdrop-blur-xl">
      <div className="flex flex-col space-y-6">
        {/* Logo Brand */}
        <Link href="/create" className="flex items-center space-x-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 shadow-md shadow-purple-600/30">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold tracking-tight text-white text-lg">Veo3</span>
              <span className="rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                Studio
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">Veo & Imagen AI</p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-purple-400" : "text-zinc-400"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Logout */}
      <div className="flex flex-col space-y-3 border-t border-zinc-800/80 pt-4 px-2">
        <div className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-2.5 border border-zinc-800/50">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-zinc-300 font-medium">Google GenAI</span>
          </div>
          <span className="text-[11px] text-zinc-500">Online</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-rose-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
