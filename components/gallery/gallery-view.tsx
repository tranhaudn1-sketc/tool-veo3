"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Share2,
  Square,
  Star,
  Trash2,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatBytes, formatCurrency, formatDate } from "@/lib/utils";

export interface AssetRecord {
  id: string;
  generationId: string;
  filePath: string;
  thumbnailPath?: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sizeBytes?: number;
  url: string;
  thumbnailUrl: string;
}

export interface GenerationRecord {
  id: string;
  type: "image" | "video";
  mode: "t2i" | "i2i" | "t2v" | "i2v";
  prompt: string;
  negativePrompt?: string;
  model: string;
  params: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  errorMessage?: string;
  costEstimate: number;
  isFavorite: boolean;
  createdAt: string;
  completedAt?: string;
  currentProgress?: string;
  assets: AssetRecord[];
}

interface GalleryViewProps {
  initialFavoriteOnly?: boolean;
}

export function GalleryView({ initialFavoriteOnly = false }: GalleryViewProps) {
  const router = useRouter();

  // Filter states
  const [typeFilter, setTypeFilter] = React.useState<"all" | "image" | "video">("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [favoriteOnly, setFavoriteOnly] = React.useState(initialFavoriteOnly);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Data states
  const [items, setItems] = React.useState<GenerationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Batch selection states
  const [isBatchMode, setIsBatchMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = React.useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = React.useState(false);

  // Detail Modal state
  const [selectedItem, setSelectedItem] = React.useState<GenerationRecord | null>(null);

  // Fetch Generations list
  const fetchItems = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (favoriteOnly) params.set("favorite", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("page", page.toString());
      params.set("limit", "24");

      const res = await fetch(`/api/generations?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // Catch fetch error
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, favoriteOnly, searchQuery, page]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Periodic polling for active items (processing or queued)
  React.useEffect(() => {
    const hasActive = items.some(
      (item) => item.status === "processing" || item.status === "queued"
    );

    if (hasActive) {
      const interval = setInterval(() => {
        fetchItems();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [items, fetchItems]);

  // Toggle favorite
  const handleToggleFavorite = async (item: GenerationRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/generations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      if (!res.ok) return;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isFavorite: !i.isFavorite } : i))
      );

      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
      }

      toast.success(
        !item.isFavorite ? "Đã thêm vào mục yêu thích" : "Đã gỡ khỏi mục yêu thích"
      );
    } catch {
      toast.error("Không thể cập nhật trạng thái yêu thích");
    }
  };

  // Delete item
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xoá tác phẩm này khỏi hệ thống?")) return;

    try {
      const res = await fetch(`/api/generations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Xoá thất bại.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      toast.success("Đã xoá tác phẩm thành công.");
    } catch {
      toast.error("Lỗi khi kết nối đến máy chủ.");
    }
  };

  // Retry failed item
  const handleRetry = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/generations/${id}/retry`, { method: "POST" });
      if (!res.ok) {
        toast.error("Không thể thử lại tác phẩm này.");
        return;
      }
      toast.success("Đã đưa tác phẩm trở lại hàng đợi.");
      fetchItems();
    } catch {
      toast.error("Lỗi khi kết nối đến máy chủ.");
    }
  };

  // Cancel queued item
  const handleCancel = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/generations/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      toast.success("Đã huỷ tác phẩm.");
      fetchItems();
    } catch {
      toast.error("Lỗi khi huỷ tác phẩm.");
    }
  };

  // Batch toggle
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xoá ${selectedIds.size} tác phẩm đã chọn?`)) return;

    setIsBatchDeleting(true);
    try {
      const res = await fetch("/api/generations/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        toast.error("Xoá hàng loạt thất bại.");
        return;
      }
      toast.success(`Đã xoá ${selectedIds.size} tác phẩm.`);
      setSelectedIds(new Set());
      setIsBatchMode(false);
      fetchItems();
    } catch {
      toast.error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Batch Download as ZIP
  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchDownloading(true);
    toast.info("Đang nén các tệp thành file ZIP, vui lòng đợi...");

    try {
      const res = await fetch("/api/generations/batch-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        toast.error("Không thể tạo tệp ZIP tải về.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `veo3_creations_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Tải xuống tệp ZIP thành công!");
    } catch {
      toast.error("Lỗi khi tải tệp ZIP.");
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // Re-create with same parameters
  const handleRecreate = (item: GenerationRecord) => {
    const params = new URLSearchParams();
    params.set("type", item.type);
    params.set("prompt", item.prompt);
    router.push(`/create?${params.toString()}`);
  };

  // Use as first frame for Video (Image-to-Video)
  const handleUseAsFirstFrame = (item: GenerationRecord) => {
    const asset = item.assets[0];
    if (!asset) return;
    const params = new URLSearchParams();
    params.set("type", "video");
    params.set("prompt", item.prompt);
    params.set("referenceImagePath", asset.filePath);
    params.set("referenceImageUrl", asset.url);
    router.push(`/create?${params.toString()}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>{initialFavoriteOnly ? "Tác phẩm Yêu thích" : "Thư viện sáng tạo"}</span>
            <Badge variant="secondary" className="ml-2">
              {total}
            </Badge>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Toàn bộ ảnh và video được lưu trữ an toàn trong máy chủ cục bộ (/storage)
          </p>
        </div>

        {/* Batch action toggle */}
        <div className="flex items-center space-x-2">
          {isBatchMode ? (
            <div className="flex items-center space-x-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectedIds.size === items.length ? deselectAll : selectAll}
                className="text-xs"
              >
                {selectedIds.size === items.length ? "Bỏ chọn" : "Chọn tất cả"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDownload}
                disabled={selectedIds.size === 0 || isBatchDownloading}
                className="text-xs text-purple-300 border-purple-500/30"
              >
                {isBatchDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Archive className="h-3.5 w-3.5 mr-1" />
                )}
                <span>Tải ZIP ({selectedIds.size})</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0 || isBatchDeleting}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span>Xoá ({selectedIds.size})</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsBatchMode(false);
                  setSelectedIds(new Set());
                }}
                className="text-xs text-zinc-400"
              >
                Đóng
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchMode(true)}
              className="text-xs border-zinc-700/80 text-zinc-300 hover:text-white"
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              <span>Chọn nhiều</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0d101b]/80 p-3 rounded-2xl border border-zinc-800 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filters */}
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-850">
            <button
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                typeFilter === "all" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Tất cả
            </button>
            <button
              onClick={() => setTypeFilter("video")}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-semibold transition-colors flex items-center space-x-1",
                typeFilter === "video" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Video className="h-3 w-3 mr-1" />
              <span>Video</span>
            </button>
            <button
              onClick={() => setTypeFilter("image")}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-semibold transition-colors flex items-center space-x-1",
                typeFilter === "image" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <ImageIcon className="h-3 w-3 mr-1" />
              <span>Ảnh</span>
            </button>
          </div>

          {/* Status filters */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="processing">Đang tạo</option>
            <option value="failed">Thất bại</option>
          </select>

          {/* Favorite filter toggle */}
          <button
            onClick={() => setFavoriteOnly(!favoriteOnly)}
            className={cn(
              "flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors",
              favoriteOnly
                ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", favoriteOnly && "fill-amber-400 text-amber-400")} />
            <span>Yêu thích</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo prompt..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-xs">Đang tải thư viện tác phẩm...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 p-16 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-600">
            <Film className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Chưa có tác phẩm nào</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              Hãy bắt đầu tạo tác phẩm đầu tiên bằng Google Veo hoặc Imagen 3!
            </p>
          </div>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => router.push("/create")}
            className="font-semibold"
          >
            <Wand2 className="h-4 w-4 mr-1.5" />
            <span>Tạo tác phẩm ngay</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const firstAsset = item.assets[0];

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isBatchMode) {
                    toggleSelect(item.id);
                  } else {
                    setSelectedItem(item);
                  }
                }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 transition-all duration-200 cursor-pointer hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20",
                  isSelected && "border-purple-500 ring-2 ring-purple-500/30"
                )}
              >
                {/* Media Preview Box */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                  {item.status === "completed" && firstAsset ? (
                    item.type === "video" ? (
                      <div className="relative h-full w-full">
                        {/* Video Element for hover autoplay */}
                        <video
                          src={firstAsset.url}
                          poster={firstAsset.thumbnailUrl}
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-zinc-200 backdrop-blur-sm flex items-center space-x-1">
                          <Film className="h-2.5 w-2.5" />
                          <span>{firstAsset.durationSec || 5}s</span>
                        </div>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={firstAsset.url}
                        alt={item.prompt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )
                  ) : item.status === "processing" ? (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center space-y-2 bg-purple-950/20 animate-pulse">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                      <span className="text-[11px] font-medium text-purple-300">
                        {item.currentProgress || "Đang xử lý..."}
                      </span>
                    </div>
                  ) : item.status === "queued" ? (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center space-y-2 bg-zinc-900/80">
                      <Clock className="h-6 w-6 text-zinc-500 animate-spin" />
                      <span className="text-[11px] text-zinc-400">Đang xếp hàng...</span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center space-y-2 bg-rose-950/20">
                      <AlertCircle className="h-6 w-6 text-rose-500" />
                      <span className="text-[11px] text-rose-400 font-medium">Tạo thất bại</span>
                      <button
                        onClick={(e) => handleRetry(item.id, e)}
                        className="rounded-lg bg-rose-600/20 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-600/30 flex items-center space-x-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Thử lại</span>
                      </button>
                    </div>
                  )}

                  {/* Top badges (Type & Star) */}
                  <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                    <Badge variant={item.type === "video" ? "purple" : "default"}>
                      {item.type === "video" ? "Veo" : "Imagen"}
                    </Badge>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    {/* Batch checkbox */}
                    {isBatchMode && (
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(item.id, e)}
                        className="rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Square className="h-4 w-4 text-zinc-400" />
                        )}
                      </button>
                    )}

                    {/* Favorite star */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(item, e)}
                      className="rounded-lg bg-black/60 p-1.5 text-zinc-300 hover:text-amber-400 backdrop-blur-sm transition-colors"
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          item.isFavorite && "fill-amber-400 text-amber-400"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Card Info footer */}
                <div className="p-3">
                  <p className="text-xs font-medium text-zinc-200 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{formatDate(item.createdAt)}</span>
                    <span className="font-mono text-zinc-400">
                      {formatCurrency(item.costEstimate)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <Dialog
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          maxWidth="max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Media Player Box */}
            <div className="flex flex-col justify-center rounded-2xl bg-black overflow-hidden border border-zinc-800">
              {selectedItem.status === "completed" && selectedItem.assets[0] ? (
                selectedItem.type === "video" ? (
                  <video
                    src={selectedItem.assets[0].url}
                    controls
                    autoPlay
                    loop
                    className="max-h-[460px] w-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedItem.assets[0].url}
                    alt={selectedItem.prompt}
                    className="max-h-[460px] w-full object-contain"
                  />
                )
              ) : (
                <div className="flex h-64 items-center justify-center p-6 text-center text-xs text-zinc-400">
                  {selectedItem.status === "processing"
                    ? "Tác phẩm đang được tạo..."
                    : selectedItem.errorMessage || "Không có phương tiện khả dụng"}
                </div>
              )}
            </div>

            {/* Information & Action Side */}
            <div className="flex flex-col justify-between space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={selectedItem.type === "video" ? "purple" : "default"}>
                    {selectedItem.type === "video" ? "Video (Veo)" : "Ảnh (Imagen 3)"}
                  </Badge>
                  <span className="text-[11px] text-zinc-500">
                    {formatDate(selectedItem.createdAt)}
                  </span>
                </div>

                {/* Prompt block */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[11px]">
                      Nội dung Prompt:
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedItem.prompt);
                        toast.success("Đã sao chép prompt!");
                      }}
                      className="text-[11px] text-purple-400 hover:underline flex items-center space-x-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-zinc-200 leading-relaxed max-h-36 overflow-y-auto">
                    {selectedItem.prompt}
                  </div>
                </div>

                {/* Negative prompt block if exists */}
                {selectedItem.negativePrompt && (
                  <div>
                    <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[11px] block mb-1">
                      Negative Prompt:
                    </span>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5 text-zinc-400 italic">
                      {selectedItem.negativePrompt}
                    </div>
                  </div>
                )}

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-[11px]">
                  <div>
                    <span className="text-zinc-500">Mô hình: </span>
                    <span className="text-zinc-200 font-medium">{selectedItem.model}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Chi phí ước tính: </span>
                    <span className="text-emerald-400 font-mono font-medium">
                      {formatCurrency(selectedItem.costEstimate)}
                    </span>
                  </div>
                  {selectedItem.assets[0]?.sizeBytes && (
                    <div>
                      <span className="text-zinc-500">Dung lượng: </span>
                      <span className="text-zinc-200">
                        {formatBytes(selectedItem.assets[0].sizeBytes)}
                      </span>
                    </div>
                  )}
                  {selectedItem.assets[0]?.durationSec && (
                    <div>
                      <span className="text-zinc-500">Thời lượng: </span>
                      <span className="text-zinc-200">
                        {selectedItem.assets[0].durationSec}s
                      </span>
                    </div>
                  )}
                </div>

                {/* Error message if failed */}
                {selectedItem.status === "failed" && selectedItem.errorMessage && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-400 text-[11px]">
                    {selectedItem.errorMessage}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecreate(selectedItem)}
                    className="text-xs"
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1" />
                    <span>Tạo lại với prompt này</span>
                  </Button>

                  {selectedItem.type === "image" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseAsFirstFrame(selectedItem)}
                      className="text-xs text-purple-300 border-purple-500/30"
                    >
                      <Film className="h-3.5 w-3.5 mr-1" />
                      <span>Dùng làm ảnh đầu cho video</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFavorite(selectedItem)}
                      className="text-xs"
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5 mr-1",
                          selectedItem.isFavorite && "fill-amber-400 text-amber-400"
                        )}
                      />
                      <span>{selectedItem.isFavorite ? "Đã yêu thích" : "Yêu thích"}</span>
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  {selectedItem.assets[0] ? (
                    <a
                      href={selectedItem.assets[0].url}
                      download
                      className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      <span>Tải về máy</span>
                    </a>
                  ) : selectedItem.status === "failed" ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRetry(selectedItem.id)}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      <span>Thử lại tác vụ</span>
                    </Button>
                  ) : (
                    <div />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(selectedItem.id)}
                    className="text-xs text-rose-400 hover:bg-rose-950/30 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span>Xoá</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
