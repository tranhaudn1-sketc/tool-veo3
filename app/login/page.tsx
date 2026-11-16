"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Film, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu truy cập.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Mật khẩu không chính xác.");
        setLoading(false);
        return;
      }

      toast.success("Đăng nhập thành công!");
      router.push("/create");
      router.refresh();
    } catch {
      setError("Có lỗi kết nối đến máy chủ. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/20 to-blue-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Glow Border Box */}
        <div className="relative rounded-3xl border border-zinc-800/80 bg-[#0e111d]/90 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 shadow-lg shadow-purple-600/30 mb-4">
              <Film className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Veo3 AI Studio</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Không gian sáng tạo Ảnh & Video cá nhân
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-sm font-medium text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Mật khẩu truy cập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập APP_PASSWORD..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full font-semibold"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang xác thực...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Mở khoá Studio</span>
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-xs text-zinc-500">
            Hỗ trợ bởi Google Veo (Video) & Imagen 3 (Image)
          </div>
        </div>
      </div>
    </div>
  );
}
