"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Copy,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MODELS_CONFIG,
  SamplePrompt,
  StylePreset,
} from "@/lib/config/models.config";
import { cn } from "@/lib/utils";

function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: Image vs Video
  const [activeTab, setActiveTab] = React.useState<"image" | "video">("video");

  // Form states
  const [prompt, setPrompt] = React.useState("");
  const [negativePrompt, setNegativePrompt] = React.useState("");
  const [showNegative, setShowNegative] = React.useState(false);
  const [selectedStyle, setSelectedStyle] = React.useState<string | null>(null);

  // Model & Params
  const [imageModel, setImageModel] = React.useState(MODELS_CONFIG.defaultImageModel);
  const [videoModel, setVideoModel] = React.useState(MODELS_CONFIG.defaultVideoModel);
  const [aspectRatio, setAspectRatio] = React.useState("16:9");
  const [sampleCount, setSampleCount] = React.useState(1);
  const [duration, setDuration] = React.useState(5);
  const [resolution, setResolution] = React.useState("720p");
  const [enableAudio, setEnableAudio] = React.useState(false);
  const [seed, setSeed] = React.useState<string>("");

  // Reference Image Upload state (for I2I & I2V)
  const [referenceImagePath, setReferenceImagePath] = React.useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Enhance Prompt Modal
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [enhancedResult, setEnhancedResult] = React.useState<string | null>(null);
  const [showEnhanceModal, setShowEnhanceModal] = React.useState(false);

  // Sample prompt drawer
  const [showSampleDrawer, setShowSampleDrawer] = React.useState(false);

  // Submission & Active Job state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeJob, setActiveJob] = React.useState<{
    id: string;
    type: "image" | "video";
    prompt: string;
    status: string;
    progress: string | null;
  } | null>(null);

  // Parse pre-filled query params (from Gallery "Tạo lại" or "Dùng làm ảnh đầu")
  React.useEffect(() => {
    const qType = searchParams.get("type");
    const qPrompt = searchParams.get("prompt");
    const qRef = searchParams.get("referenceImagePath");
    const qRefUrl = searchParams.get("referenceImageUrl");

    if (qType === "image" || qType === "video") {
      setActiveTab(qType);
    }
    if (qPrompt) {
      setPrompt(qPrompt);
    }
    if (qRef) {
      setReferenceImagePath(qRef);
      if (qRefUrl) setReferenceImageUrl(qRefUrl);
      else setReferenceImageUrl(`/api/assets/${qRef}`);
    }
  }, [searchParams]);

  // Adjust aspect ratio default when switching tabs
  const handleTabChange = (tab: "image" | "video") => {
    setActiveTab(tab);
    if (tab === "video" && !["16:9", "9:16"].includes(aspectRatio)) {
      setAspectRatio("16:9");
    }
  };

  // Drag and drop upload handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Tải ảnh lên thất bại");
        return;
      }
      setReferenceImagePath(data.storagePath);
      setReferenceImageUrl(data.url);
      toast.success("Đã tải ảnh tham chiếu lên!");
    } catch {
      toast.error("Không thể kết nối đến máy chủ để tải ảnh");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Enhance Prompt using Gemini
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      toast.error("Vui lòng nhập prompt trước khi yêu cầu tối ưu!");
      return;
    }
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/ai/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: activeTab }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể tối ưu prompt");
        return;
      }
      setEnhancedResult(data.enhancedPrompt);
      setShowEnhanceModal(true);
    } catch {
      toast.error("Lỗi khi kết nối AI để tối ưu prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyEnhancedPrompt = () => {
    if (enhancedResult) {
      setPrompt(enhancedResult);
      setShowEnhanceModal(false);
      toast.success("Đã áp dụng prompt nâng cao!");
    }
  };

  // Style preset toggle
  const handleSelectStyle = (style: StylePreset) => {
    if (selectedStyle === style.id) {
      setSelectedStyle(null);
      // Remove suffix
      setPrompt((prev) => prev.replace(style.promptSuffix, ""));
    } else {
      setSelectedStyle(style.id);
      // Append suffix if not present
      if (!prompt.includes(style.promptSuffix)) {
        setPrompt((prev) => `${prev.trim()}${style.promptSuffix}`);
      }
    }
  };

  // Sample prompt selection
  const handleSelectSample = (sample: SamplePrompt) => {
    setPrompt(sample.prompt);
    if (sample.negativePrompt) {
      setNegativePrompt(sample.negativePrompt);
      setShowNegative(true);
    }
    setAspectRatio(sample.aspectRatio);
    if (sample.style) {
      setSelectedStyle(sample.style);
    }
    setShowSampleDrawer(false);
    toast.success(`Đã điền mẫu: "${sample.title}"`);
  };

  // Check active jobs polling
  React.useEffect(() => {
    const pollActive = async () => {
      try {
        const res = await fetch("/api/generations?status=processing&limit=1");
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const first = data.items[0];
            setActiveJob({
              id: first.id,
              type: first.type,
              prompt: first.prompt,
              status: first.status,
              progress: first.currentProgress,
            });
            return;
          }
        }
        // If no processing job, check queued
        const resQueued = await fetch("/api/generations?status=queued&limit=1");
        if (resQueued.ok) {
          const dataQ = await resQueued.json();
          if (dataQ.items && dataQ.items.length > 0) {
            const firstQ = dataQ.items[0];
            setActiveJob({
              id: firstQ.id,
              type: firstQ.type,
              prompt: firstQ.prompt,
              status: firstQ.status,
              progress: "Đang chờ trong hàng đợi...",
            });
            return;
          }
        }
        setActiveJob(null);
      } catch {
        // Silent poll
      }
    };

    pollActive();
    const interval = setInterval(pollActive, 3000);
    return () => clearInterval(interval);
  }, []);

  // Main Submit Generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Vui lòng nhập prompt mô tả tác phẩm!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type: activeTab,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        aspectRatio,
        referenceImagePath: referenceImagePath || undefined,
        seed: seed.trim() ? parseInt(seed, 10) : undefined,
      };

      if (activeTab === "video") {
        payload.model = videoModel;
        payload.durationSeconds = duration;
        payload.resolution = resolution;
        payload.enableAudio = enableAudio;
      } else {
        payload.model = imageModel;
        payload.sampleCount = sampleCount;
      }

      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Tạo tác phẩm thất bại.");
        setIsSubmitting(false);
        return;
      }

      toast.success(
        activeTab === "video"
          ? "Đã đưa video vào hàng đợi Veo!"
          : "Đã đưa yêu cầu tạo ảnh vào hàng đợi!",
        {
          description: "Hệ thống đang chạy nền, bạn có thể theo dõi tiến độ ở đây hoặc trong Thư viện.",
        }
      );

      setActiveJob({
        id: data.generation.id,
        type: activeTab,
        prompt: prompt.trim(),
        status: "queued",
        progress: "Đang xếp hàng...",
      });
    } catch {
      toast.error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut Ctrl/Cmd + Enter
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Calculate estimated price badge
  const estimatedCost = React.useMemo(() => {
    if (activeTab === "video") {
      const modelCfg = MODELS_CONFIG.videoModels.find((m) => m.id === videoModel);
      const perSec = modelCfg?.pricing.perSecond ?? 0.06;
      return `$${(perSec * duration).toFixed(3)}`;
    } else {
      const modelCfg = MODELS_CONFIG.imageModels.find((m) => m.id === imageModel);
      const perImg = modelCfg?.pricing.perImage ?? 0.03;
      return `$${(perImg * sampleCount).toFixed(3)}`;
    }
  }, [activeTab, videoModel, imageModel, duration, sampleCount]);

  return (
    <AppLayout>
      <div className="flex h-full flex-col lg:flex-row">
        {/* Main Workspace (Left / Middle) */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Mode Switch Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex rounded-2xl bg-zinc-900/90 p-1.5 border border-zinc-800 shadow-inner">
              <button
                onClick={() => handleTabChange("video")}
                className={cn(
                  "flex items-center space-x-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200",
                  activeTab === "video"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Video className="h-4 w-4" />
                <span>Tạo Video (Veo)</span>
              </button>
              <button
                onClick={() => handleTabChange("image")}
                className={cn(
                  "flex items-center space-x-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200",
                  activeTab === "image"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Tạo Ảnh (Imagen 3)</span>
              </button>
            </div>

            {/* Sample Prompts Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSampleDrawer(!showSampleDrawer)}
              className="text-xs text-purple-300 border-purple-500/30 hover:bg-purple-950/30"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
              <span>Prompt mẫu gợi ý</span>
            </Button>
          </div>

          {/* Sample Prompts Tray (Collapsible) */}
          {showSampleDrawer && (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/15 p-4 space-y-3 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  Chọn prompt mẫu sẵn có để thử ngay:
                </span>
                <button
                  onClick={() => setShowSampleDrawer(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MODELS_CONFIG.samplePrompts
                  .filter((p) => p.type === activeTab)
                  .map((sample) => (
                    <div
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 hover:border-purple-500/50 hover:bg-zinc-850 transition-all text-left"
                    >
                      <div className="font-semibold text-xs text-white line-clamp-1">
                        {sample.title}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                        {sample.prompt}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Prompt Box Container */}
          <div className="relative rounded-3xl border border-zinc-800/90 bg-[#0d101b]/80 p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <span>Nội dung Prompt</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  (Mô tả chi tiết bằng tiếng Việt hoặc tiếng Anh)
                </span>
              </label>

              {/* Enhance Prompt Button */}
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !prompt.trim()}
                className="flex items-center space-x-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-40"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang tối ưu bằng Gemini...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                    <span>Cải thiện prompt</span>
                  </>
                )}
              </button>
            </div>

            {/* Prompt Textarea */}
            <div className="relative">
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === "video"
                    ? "Mô tả cảnh quay video... (ví dụ: Cú bay camera mượt mà qua phố cổ Hội An đêm mưa, ánh đèn lồng rực rỡ phản chiếu mặt nước, chất lượng điện ảnh 4k...)"
                    : "Mô tả hình ảnh bạn muốn tạo... (ví dụ: Chân dung một nữ chiến binh tương lai mặc giáp công nghệ neon, ánh sáng phản chiếu chân thực, 8k...)"
                }
                className="w-full resize-none rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
              />
              <div className="absolute bottom-3 right-3 text-[11px] text-zinc-500">
                {prompt.length}/2000 ký tự
              </div>
            </div>

            {/* Negative Prompt Collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowNegative(!showNegative)}
                className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {showNegative ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                <span>Negative prompt (Nội dung loại trừ - Tùy chọn)</span>
              </button>

              {showNegative && (
                <div className="mt-2.5">
                  <textarea
                    rows={2}
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Những yếu tố bạn không muốn xuất hiện: mờ, vỡ hình, tay dị dạng, rung lắc, chất lượng kém..."
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none transition-all"
                  />
                </div>
              )}
            </div>

            {/* Reference Image Upload (For I2I & I2V) */}
            <div className="border-t border-zinc-800/80 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                  <span>
                    {activeTab === "video"
                      ? "Ảnh khung hình đầu (Image-to-Video)"
                      : "Ảnh tham chiếu (Image-to-Image / Sửa ảnh)"}
                  </span>
                </span>
                {referenceImagePath && (
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceImagePath(null);
                      setReferenceImageUrl(null);
                    }}
                    className="text-[11px] text-rose-400 hover:underline flex items-center space-x-1"
                  >
                    <X className="h-3 w-3" />
                    <span>Gỡ ảnh</span>
                  </button>
                )}
              </div>

              {referenceImageUrl ? (
                <div className="relative inline-block rounded-xl overflow-hidden border border-purple-500/40 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referenceImageUrl}
                    alt="Ảnh tham chiếu"
                    className="h-28 w-44 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceImagePath(null);
                        setReferenceImageUrl(null);
                      }}
                      className="rounded-full bg-red-600/80 p-1.5 text-white hover:bg-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/40 p-4 hover:border-purple-500/40 transition-colors text-center cursor-pointer"
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  {isUploading ? (
                    <div className="flex items-center space-x-2 text-xs text-purple-400 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang tải ảnh lên...</span>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Upload className="mx-auto h-6 w-6 text-zinc-500 mb-1" />
                      <p className="text-xs text-zinc-300 font-medium">
                        Kéo thả ảnh vào đây hoặc bấm để chọn tệp
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        JPG, PNG, WEBP tối đa 15MB
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Style Presets Pills */}
            <div className="border-t border-zinc-800/80 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2.5">
                Phong cách nghệ thuật (Presets)
              </span>
              <div className="flex flex-wrap gap-2">
                {MODELS_CONFIG.stylePresets.map((preset) => {
                  const isSelected = selectedStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectStyle(preset)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 border",
                        isSelected
                          ? "bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm shadow-purple-500/20"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                      )}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Generate Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80 pt-4">
              <div className="flex items-center space-x-2 text-xs text-zinc-400">
                <span>Ước tính chi phí:</span>
                <Badge variant="purple" className="font-mono text-xs">
                  {estimatedCost}
                </Badge>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  Ctrl + Enter để tạo
                </span>
              </div>

              <Button
                variant="gradient"
                size="lg"
                onClick={handleGenerate}
                disabled={isSubmitting || !prompt.trim()}
                className="w-full sm:w-auto min-w-[200px] font-semibold text-sm h-12 shadow-lg shadow-purple-600/30"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang gửi tác vụ...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {activeTab === "video" ? "Tạo Video với Veo" : "Tạo Ảnh với Imagen"}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Active Job Progress / Skeleton Card */}
          {activeJob && (
            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5 shadow-xl backdrop-blur-md space-y-3 animate-pulse-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                  </div>
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    {activeJob.type === "video"
                      ? "Google Veo đang xử lý video"
                      : "Google Imagen đang tạo ảnh"}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  ID: {activeJob.id.slice(0, 8)}
                </Badge>
              </div>

              <p className="text-xs text-zinc-300 italic line-clamp-1">
                "{activeJob.prompt}"
              </p>

              {/* Progress message bar */}
              <div className="flex items-center justify-between text-xs text-purple-300 bg-purple-900/30 px-3 py-2 rounded-xl border border-purple-500/20">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  <span>{activeJob.progress || "Đang xử lý trong hàng đợi..."}</span>
                </div>
                <button
                  onClick={() => router.push("/gallery")}
                  className="text-[11px] underline text-purple-300 hover:text-white"
                >
                  Xem trong Thư viện
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Options Sidebar Panel */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800/80 bg-[#0a0c14]/80 p-5 space-y-6">
          <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/80">
            <Layers className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Tuỳ chọn cấu hình</h2>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Mô hình AI
            </label>
            {activeTab === "video" ? (
              <select
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              >
                {MODELS_CONFIG.videoModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.pricing.perSecond}/s)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              >
                {MODELS_CONFIG.imageModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.pricing.perImage}/ảnh)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Aspect Ratio Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tỉ lệ khung hình (Aspect Ratio)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(activeTab === "video" ? ["16:9", "9:16"] : ["1:1", "16:9", "9:16", "4:3", "3:4"]).map(
                (ar) => {
                  const isSelected = aspectRatio === ar;
                  return (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setAspectRatio(ar)}
                      className={cn(
                        "rounded-xl py-2 text-xs font-semibold transition-all border",
                        isSelected
                          ? "bg-purple-600/20 border-purple-500 text-purple-200"
                          : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white"
                      )}
                    >
                      {ar}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Video Specific Parameters */}
          {activeTab === "video" ? (
            <>
              {/* Duration */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-purple-400" />
                  <span>Thời lượng (Giây)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[5, 8].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDuration(sec)}
                      className={cn(
                        "rounded-xl py-2 text-xs font-semibold transition-all border",
                        duration === sec
                          ? "bg-purple-600/20 border-purple-500 text-purple-200"
                          : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white"
                      )}
                    >
                      {sec} giây
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Độ phân giải
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["720p", "1080p"].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setResolution(res)}
                      className={cn(
                        "rounded-xl py-2 text-xs font-semibold transition-all border",
                        resolution === res
                          ? "bg-purple-600/20 border-purple-500 text-purple-200"
                          : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white"
                      )}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio toggle */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="flex items-center space-x-2">
                  {enableAudio ? (
                    <Volume2 className="h-4 w-4 text-purple-400" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-zinc-500" />
                  )}
                  <span className="text-xs font-medium text-zinc-300">
                    Âm thanh nền (Veo Audio)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableAudio(!enableAudio)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    enableAudio ? "bg-purple-600" : "bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      enableAudio ? "translate-x-4.5" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </>
          ) : (
            /* Image Specific Parameters */
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Số lượng ảnh sinh ra (1 - 4)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSampleCount(num)}
                    className={cn(
                      "rounded-xl py-2 text-xs font-semibold transition-all border",
                      sampleCount === num
                        ? "bg-purple-600/20 border-purple-500 text-purple-200"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seed Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Seed (Ngẫu nhiên - Tuỳ chọn)
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Để trống để ngẫu nhiên"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </aside>
      </div>

      {/* Modal: Enhance Prompt Approval */}
      <Dialog
        open={showEnhanceModal}
        onOpenChange={setShowEnhanceModal}
        maxWidth="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-purple-400" />
            <span>Đề xuất Prompt đã cải thiện</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div>
            <span className="font-semibold text-zinc-400 block mb-1">Prompt ban đầu:</span>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-zinc-300">
              {prompt}
            </div>
          </div>

          <div>
            <span className="font-semibold text-purple-400 block mb-1">
              Prompt tối ưu bởi Gemini Flash:
            </span>
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5 text-white leading-relaxed">
              {enhancedResult}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEnhanceModal(false)}
          >
            Giữ nguyên prompt gốc
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={applyEnhancedPrompt}
            className="font-semibold"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Áp dụng prompt này
          </Button>
        </DialogFooter>
      </Dialog>
    </AppLayout>
  );
}

export default function CreatePage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mr-2" />
          <span className="text-xs">Đang tải studio sáng tạo...</span>
        </div>
      }
    >
      <CreateContent />
    </React.Suspense>
  );
}
