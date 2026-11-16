"use client";

import * as React from "react";
import { toast } from "sonner";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Global polling for active jobs
  React.useEffect(() => {
    let prevActiveIds = new Set<string>();

    const checkActiveJobs = async () => {
      try {
        const res = await fetch("/api/generations?status=processing&limit=10");
        if (!res.ok) return;
        const data = await res.json();
        const activeItems = data.items || [];
        const currentActiveIds = new Set<string>(activeItems.map((i: { id: string }) => i.id));

        // Check if any previously active job has disappeared (completed or failed)
        for (const oldId of prevActiveIds) {
          if (!currentActiveIds.has(oldId)) {
            // Check status of completed job
            const checkRes = await fetch(`/api/generations/${oldId}`);
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              const gen = checkData.generation;
              if (gen.status === "completed") {
                toast.success(
                  gen.type === "video"
                    ? "Video Veo đã được tạo thành công!"
                    : "Ảnh Imagen 3 đã hoàn tất!",
                  {
                    description: gen.prompt.slice(0, 60) + (gen.prompt.length > 60 ? "..." : ""),
                  }
                );
              } else if (gen.status === "failed") {
                toast.error("Tạo tác phẩm thất bại", {
                  description: gen.errorMessage || "Vui lòng thử lại với prompt khác.",
                });
              }
            }
          }
        }

        prevActiveIds = currentActiveIds;
      } catch {
        // Silent catch for background poll
      }
    };

    const interval = setInterval(checkActiveJobs, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#07080d]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
      </div>
    </div>
  );
}
