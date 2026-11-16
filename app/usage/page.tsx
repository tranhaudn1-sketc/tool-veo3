"use client";

import * as React from "react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  Film,
  Image as ImageIcon,
  Loader2,
  Percent,
  Save,
  Video,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CostSummary } from "@/lib/cost/calculator";
import { formatCurrency } from "@/lib/utils";

export default function UsagePage() {
  const [summary, setSummary] = React.useState<CostSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [newLimit, setNewLimit] = React.useState<string>("");
  const [isUpdatingLimit, setIsUpdatingLimit] = React.useState(false);

  const fetchUsage = React.useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data.summary);
      setNewLimit(data.summary.dailyLimit.toString());
    } catch {
      toast.error("Không thể tải thông tin chi phí.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newLimit);
    if (isNaN(val) || val <= 0) {
      toast.error("Vui lòng nhập hạn mức hợp lệ (> $0).");
      return;
    }

    setIsUpdatingLimit(true);
    try {
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: val }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Cập nhật thất bại.");
        return;
      }
      toast.success(data.message || "Đã lưu hạn mức chi tiêu mới.");
      fetchUsage();
    } catch {
      toast.error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-purple-400" />
            <span>Chi phí & Thống kê sử dụng</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Theo dõi lượng tài nguyên và kiểm soát ngân sách chi tiêu Google Veo / Imagen API
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-xs">Đang tải dữ liệu chi phí...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Warning if exceeded */}
            {summary.isDailyLimitExceeded && (
              <div className="flex items-center space-x-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-300 backdrop-blur-md">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Cảnh báo hạn mức: </span>
                  Chi phí hôm nay ({formatCurrency(summary.todayCost)}) đã chạm hoặc vượt mức hạn
                  ngân sách ngày ({formatCurrency(summary.dailyLimit)}). Các yêu cầu tạo mới sẽ bị
                  chặn cho tới ngày mai hoặc khi bạn tăng hạn mức bên dưới.
                </div>
              </div>
            )}

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Today Cost */}
              <Card className="border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-zinc-950/60">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-medium">
                    <span>Hôm nay</span>
                    <DollarSign className="h-4 w-4 text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-white">
                    {formatCurrency(summary.todayCost)}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Hạn mức: {formatCurrency(summary.dailyLimit)}/ngày
                  </p>
                </CardContent>
              </Card>

              {/* 7 Days Cost */}
              <Card className="border-zinc-800 bg-zinc-950/60">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span>7 ngày qua</span>
                    <Calendar className="h-4 w-4 text-indigo-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-white">
                    {formatCurrency(summary.weekCost)}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Ước tính theo đơn giá config</p>
                </CardContent>
              </Card>

              {/* 30 Days Cost */}
              <Card className="border-zinc-800 bg-zinc-950/60">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span>30 ngày qua</span>
                    <Wallet className="h-4 w-4 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-white">
                    {formatCurrency(summary.monthCost)}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Tổng chi: {formatCurrency(summary.allTimeCost)}
                  </p>
                </CardContent>
              </Card>

              {/* Success Rate */}
              <Card className="border-zinc-800 bg-zinc-950/60">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span>Tỉ lệ thành công</span>
                    <Percent className="h-4 w-4 text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {summary.successRate}%
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {summary.totalGenerations} lượt tạo hoàn tất
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown & Daily Budget Setting Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Media Distribution Breakdown */}
              <Card className="border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Phân loại định dạng sáng tạo</span>
                </h3>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center text-zinc-300">
                      <Video className="h-4 w-4 text-purple-400 mr-2" />
                      <span>Video (Google Veo)</span>
                    </span>
                    <span className="font-semibold text-white">{summary.videosCount} video</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.totalGenerations > 0
                            ? (summary.videosCount / summary.totalGenerations) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className="flex items-center text-zinc-300">
                      <ImageIcon className="h-4 w-4 text-blue-400 mr-2" />
                      <span>Ảnh (Google Imagen 3)</span>
                    </span>
                    <span className="font-semibold text-white">{summary.imagesCount} ảnh</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.totalGenerations > 0
                            ? (summary.imagesCount / summary.totalGenerations) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </Card>

              {/* Set Daily Spend Limit Card */}
              <Card className="border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Hạn mức chi tiêu hàng ngày</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Nếu tổng chi phí trong ngày chạm ngưỡng này, hệ thống sẽ tự động chặn các lượt
                    tạo mới để bảo vệ ngân sách của bạn.
                  </p>
                </div>

                <form onSubmit={handleUpdateLimit} className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Hạn mức tối đa (USD / ngày)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="500"
                        value={newLimit}
                        onChange={(e) => setNewLimit(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    size="sm"
                    disabled={isUpdatingLimit}
                    className="font-semibold"
                  >
                    {isUpdatingLimit ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    <span>Lưu hạn mức chi tiêu</span>
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
