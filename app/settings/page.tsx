"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  HardDrive,
  Info,
  KeyRound,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODELS_CONFIG } from "@/lib/config/models.config";

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Đã đăng xuất.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Không thể đăng xuất.");
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <SettingsIcon className="h-6 w-6 text-purple-400" />
            <span>Cài đặt hệ thống & Cấu hình</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Thông tin kiến trúc, cấu hình model AI và trạng thái lưu trữ
          </p>
        </div>

        {/* System Health / Status Card */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Trạng thái hệ thống</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="flex items-center space-x-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                <Database className="h-4 w-4 text-purple-400" />
                <div>
                  <div className="font-semibold text-white">SQLite Database</div>
                  <div className="text-[11px] text-emerald-400 flex items-center mt-0.5">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <span>Đã kết nối (Prisma)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                <HardDrive className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="font-semibold text-white">Local Storage</div>
                  <div className="text-[11px] text-emerald-400 flex items-center mt-0.5">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <span>/storage sẵn sàng</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
                <Cpu className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Video Processor</div>
                  <div className="text-[11px] text-emerald-400 flex items-center mt-0.5">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <span>ffmpeg-static OK</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Configurations Table */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Video className="h-4 w-4 text-purple-400" />
              <span>Danh mục Model AI được cấu hình (models.config.ts)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2.5 font-medium">Tên hiển thị</th>
                    <th className="py-2.5 font-medium">Model ID</th>
                    <th className="py-2.5 font-medium">Loại</th>
                    <th className="py-2.5 font-medium">Đơn giá ước tính</th>
                    <th className="py-2.5 font-medium">Tỉ lệ hỗ trợ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {MODELS_CONFIG.videoModels.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-900/40">
                      <td className="py-3 font-semibold text-white">{m.name}</td>
                      <td className="py-3 font-mono text-[11px] text-purple-400">{m.id}</td>
                      <td className="py-3">
                        <Badge variant="purple">Video</Badge>
                      </td>
                      <td className="py-3 font-mono text-emerald-400">${m.pricing.perSecond}/s</td>
                      <td className="py-3 text-[11px] text-zinc-400">
                        {m.supportedAspectRatios.join(", ")}
                      </td>
                    </tr>
                  ))}
                  {MODELS_CONFIG.imageModels.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-900/40">
                      <td className="py-3 font-semibold text-white">{m.name}</td>
                      <td className="py-3 font-mono text-[11px] text-blue-400">{m.id}</td>
                      <td className="py-3">
                        <Badge variant="default">Ảnh</Badge>
                      </td>
                      <td className="py-3 font-mono text-emerald-400">${m.pricing.perImage}/ảnh</td>
                      <td className="py-3 text-[11px] text-zinc-400">
                        {m.supportedAspectRatios.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Developer Guide / How to add new provider */}
        <Card className="border-zinc-800 bg-zinc-950/60 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Info className="h-4 w-4 text-indigo-400" />
            <span>Mở rộng thêm AI Provider mới</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Hệ thống áp dụng kiến trúc <strong>AIProvider</strong> tách bạch hoàn toàn logic gọi API
            khỏi giao diện người dùng. Để tích hợp thêm các dịch vụ khác (ví dụ: Runway Gen-3, Luma
            Dream Machine, Fal.ai, Stable Diffusion):
          </p>
          <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-1 pl-2">
            <li>
              Tạo class mới kế thừa interface <code className="text-purple-300">AIProvider</code>{" "}
              trong thư mục <code className="text-purple-300">lib/providers/</code>.
            </li>
            <li>
              Thực thi 3 hàm chính: <code className="text-purple-300">generateImage</code>,{" "}
              <code className="text-purple-300">generateVideo</code>, và{" "}
              <code className="text-purple-300">enhancePrompt</code>.
            </li>
            <li>
              Đăng ký provider trong <code className="text-purple-300">lib/providers/index.ts</code>{" "}
              bằng hàm <code className="text-purple-300">registerAIProvider()</code>.
            </li>
          </ol>
        </Card>

        {/* Security & Logout */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            Phiên đăng nhập được bảo mật qua cookie HTTP-only (JWT/jose).
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="text-xs"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            <span>Đăng xuất tài khoản</span>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
