import path from "path";
import { prisma } from "../db";
import { createFallbackPoster, generateVideoThumbnail } from "../media/thumbnail";
import { getAIProvider } from "../providers";
import { storageProvider } from "../storage";
import { JobStatus } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var globalJobQueue: JobQueueManager | undefined;
}

export class JobQueueManager {
  private isProcessing = false;
  private isInitialized = false;
  private progressMap: Map<string, string> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  /**
   * Khởi tạo worker & xử lý phục hồi khi khởi động lại server
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Phục hồi các job bị treo ở trạng thái processing do server restart
      const stuckJobs = await prisma.generation.findMany({
        where: { status: "processing" },
      });

      if (stuckJobs.length > 0) {
        console.log(`[Queue] Phát hiện ${stuckJobs.length} job bị gián đoạn do restart. Đang đưa về hàng đợi...`);
        for (const job of stuckJobs) {
          await prisma.generation.update({
            where: { id: job.id },
            data: {
              status: "queued",
              errorMessage: "Khôi phục lại sau khi máy chủ khởi động lại.",
            },
          });
        }
      }

      // Kích hoạt xử lý ngay
      this.triggerNext();

      // Fallback polling mỗi 4 giây để đảm bảo không sót job
      if (!this.pollInterval) {
        this.pollInterval = setInterval(() => {
          this.triggerNext();
        }, 4000);
      }
    } catch (err) {
      console.error("[Queue] Lỗi khi khởi tạo queue worker:", err);
    }
  }

  /**
   * Cập nhật tiến độ tạm thời hiển thị cho frontend
   */
  public getJobProgress(generationId: string): string | null {
    return this.progressMap.get(generationId) || null;
  }

  /**
   * Kích hoạt xử lý job tiếp theo trong hàng đợi
   */
  public triggerNext(): void {
    if (this.isProcessing) return;
    this.processNextJob().catch((err) => {
      console.error("[Queue] Lỗi ngoài dự kiến trong vòng lặp queue:", err);
    });
  }

  /**
   * Huỷ một job đang ở trạng thái 'queued'
   */
  public async cancelJob(generationId: string): Promise<boolean> {
    const job = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!job || job.status !== "queued") {
      return false;
    }

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "cancelled",
        errorMessage: "Đã huỷ theo yêu cầu của người dùng.",
      },
    });

    this.progressMap.delete(generationId);
    return true;
  }

  /**
   * Thử lại một job thất bại hoặc đã huỷ
   */
  public async retryJob(generationId: string): Promise<boolean> {
    const job = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!job || (job.status !== "failed" && job.status !== "cancelled")) {
      return false;
    }

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "queued",
        errorMessage: null,
        completedAt: null,
      },
    });

    this.triggerNext();
    return true;
  }

  private async processNextJob(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      // Lấy job 'queued' cũ nhất
      const nextJob = await prisma.generation.findFirst({
        where: { status: "queued" },
        orderBy: { createdAt: "asc" },
      });

      if (!nextJob) {
        this.isProcessing = false;
        return;
      }

      // Đánh dấu là đang xử lý
      await prisma.generation.update({
        where: { id: nextJob.id },
        data: { status: "processing", errorMessage: null },
      });

      this.progressMap.set(nextJob.id, "Bắt đầu khởi tạo tác vụ...");

      await this.executeJob(nextJob.id);
    } catch (err) {
      console.error("[Queue] Lỗi khi xử lý job:", err);
    } finally {
      this.isProcessing = false;
      // Kiểm tra xem còn job nào khác không
      const hasMore = await prisma.generation.count({
        where: { status: "queued" },
      });
      if (hasMore > 0) {
        setImmediate(() => this.triggerNext());
      }
    }
  }

  private async executeJob(generationId: string): Promise<void> {
    const job = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!job || job.status !== "processing") {
      this.progressMap.delete(generationId);
      return;
    }

    const provider = getAIProvider(job.model);
    let parsedParams: Record<string, unknown> = {};
    try {
      parsedParams = JSON.parse(job.params || "{}");
    } catch {
      parsedParams = {};
    }

    try {
      // Đọc reference image nếu có
      let refImageBuffer: Buffer | undefined;
      let refImageMime: string | undefined;

      const refImagePath = parsedParams.referenceImagePath as string | undefined;
      if (refImagePath && (await storageProvider.exists(refImagePath))) {
        refImageBuffer = await storageProvider.read(refImagePath);
        const stat = await storageProvider.stat(refImagePath);
        refImageMime = stat?.mimeType || "image/jpeg";
      }

      if (job.type === "video") {
        // --- XỬ LÝ VIDEO GENERATION ---
        this.progressMap.set(generationId, "Đang gửi yêu cầu tạo video...");

        let videoResult;
        try {
          videoResult = await provider.generateVideo({
            prompt: job.prompt,
            negativePrompt: job.negativePrompt || undefined,
            model: job.model,
            aspectRatio: (parsedParams.aspectRatio as string) || "16:9",
            durationSeconds: Number(parsedParams.durationSeconds) || 5,
            resolution: (parsedParams.resolution as string) || "720p",
            enableAudio: Boolean(parsedParams.enableAudio),
            seed: parsedParams.seed ? Number(parsedParams.seed) : undefined,
            referenceImageBuffer: refImageBuffer,
            referenceImageMime: refImageMime,
            onProgress: async (msg) => {
              this.progressMap.set(generationId, msg);
            },
          });
        } catch (videoErr: unknown) {
          const errMsg = videoErr instanceof Error ? videoErr.message : String(videoErr);
          if (
            errMsg.includes("Gemini Enterprise") ||
            errMsg.includes("Vertex AI") ||
            errMsg.includes("quota") ||
            errMsg.includes("Billing")
          ) {
            console.log(`[Queue] Google Veo yêu cầu Google Cloud Billing, chuyển sang engine video chuyển động...`);
            this.progressMap.set(generationId, "Veo cần Billing, đang tạo video motion chuyển động mượt mà...");
            const fallbackProvider = getAIProvider("motion-video-free");
            videoResult = await fallbackProvider.generateVideo({
              prompt: job.prompt,
              negativePrompt: job.negativePrompt || undefined,
              model: "motion-video-free",
              aspectRatio: (parsedParams.aspectRatio as string) || "16:9",
              durationSeconds: Number(parsedParams.durationSeconds) || 5,
              resolution: (parsedParams.resolution as string) || "720p",
              seed: parsedParams.seed ? Number(parsedParams.seed) : undefined,
              onProgress: async (msg) => {
                this.progressMap.set(generationId, msg);
              },
            });
          } else {
            throw videoErr;
          }
        }

        // 1. Lưu file video vào storage
        const videoFileName = `video_${generationId}_${Date.now()}.mp4`;
        const videoStorageKey = await storageProvider.save(
          "videos",
          videoFileName,
          videoResult.videoBuffer,
          videoResult.mimeType
        );

        // 2. Tạo thumbnail video bằng ffmpeg
        const thumbFileName = `thumb_${generationId}_${Date.now()}.jpg`;
        const thumbStorageKey = `thumbnails/${thumbFileName}`;
        const absVideoPath = storageProvider.getAbsolutePath(videoStorageKey);
        const absThumbPath = storageProvider.getAbsolutePath(thumbStorageKey);

        const thumbSuccess = await generateVideoThumbnail(absVideoPath, absThumbPath, 0.5);
        if (!thumbSuccess) {
          // Tạo fallback poster nếu ffmpeg lỗi
          await createFallbackPoster(absThumbPath, job.prompt.slice(0, 40));
        }

        // 3. Ghi record Asset
        await prisma.asset.create({
          data: {
            generationId: job.id,
            filePath: videoStorageKey,
            thumbnailPath: thumbStorageKey,
            mimeType: videoResult.mimeType,
            durationSec: videoResult.durationSec,
            sizeBytes: videoResult.videoBuffer.length,
          },
        });

        // 4. Cập nhật chi phí và trạng thái Generation
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

        await prisma.generation.update({
          where: { id: job.id },
          data: {
            status: "completed",
            costEstimate: videoResult.cost,
            completedAt: now,
          },
        });

        // 5. Ghi log chi phí
        await prisma.usageLog.create({
          data: {
            date: dateStr,
            generationId: job.id,
            cost: videoResult.cost,
          },
        });
      } else {
        // --- XỬ LÝ IMAGE GENERATION ---
        this.progressMap.set(generationId, "Đang gửi yêu cầu tạo ảnh...");

        let imageResult;
        try {
          imageResult = await provider.generateImage({
            prompt: job.prompt,
            negativePrompt: job.negativePrompt || undefined,
            model: job.model,
            aspectRatio: (parsedParams.aspectRatio as string) || "1:1",
            sampleCount: Number(parsedParams.sampleCount) || 1,
            seed: parsedParams.seed ? Number(parsedParams.seed) : undefined,
            referenceImageBuffer: refImageBuffer,
            referenceImageMime: refImageMime,
          });
        } catch (imgErr: unknown) {
          const errMsg = imgErr instanceof Error ? imgErr.message : String(imgErr);
          if (
            errMsg.includes("Gemini Enterprise") ||
            errMsg.includes("Vertex AI") ||
            errMsg.includes("quota") ||
            errMsg.includes("limit: 0")
          ) {
            console.log(`[Queue] Google Imagen bị giới hạn, tự động chuyển sang mô hình FLUX.1 miễn phí...`);
            this.progressMap.set(generationId, "Google giới hạn Free Tier, đang tạo bằng FLUX.1...");
            const fallbackProvider = getAIProvider("flux-1.0-schnell");
            imageResult = await fallbackProvider.generateImage({
              prompt: job.prompt,
              negativePrompt: job.negativePrompt || undefined,
              model: "flux-1.0-schnell",
              aspectRatio: (parsedParams.aspectRatio as string) || "1:1",
              sampleCount: Number(parsedParams.sampleCount) || 1,
              seed: parsedParams.seed ? Number(parsedParams.seed) : undefined,
              referenceImageBuffer: refImageBuffer,
              referenceImageMime: refImageMime,
            });
          } else {
            throw imgErr;
          }
        }

        for (let i = 0; i < imageResult.images.length; i++) {
          const img = imageResult.images[i];
          const ext = img.mimeType.includes("png") ? "png" : "jpg";
          const imgFileName = `img_${generationId}_${i + 1}_${Date.now()}.${ext}`;

          const imageStorageKey = await storageProvider.save(
            "images",
            imgFileName,
            img.buffer,
            img.mimeType
          );

          await prisma.asset.create({
            data: {
              generationId: job.id,
              filePath: imageStorageKey,
              thumbnailPath: imageStorageKey, // Hình ảnh có thể dùng chính nó làm thumbnail
              mimeType: img.mimeType,
              sizeBytes: img.buffer.length,
            },
          });
        }

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);

        await prisma.generation.update({
          where: { id: job.id },
          data: {
            status: "completed",
            costEstimate: imageResult.cost,
            completedAt: now,
          },
        });

        await prisma.usageLog.create({
          data: {
            date: dateStr,
            generationId: job.id,
            cost: imageResult.cost,
          },
        });
      }

      this.progressMap.delete(generationId);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Queue] Job ${generationId} thất bại:`, errorMsg);

      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: "failed",
          errorMessage: errorMsg,
          completedAt: new Date(),
        },
      });

      this.progressMap.delete(generationId);
    }
  }
}

// Singleton Queue Manager
export const jobQueue = globalThis.globalJobQueue ?? new JobQueueManager();
if (process.env.NODE_ENV !== "production") {
  globalThis.globalJobQueue = jobQueue;
}
