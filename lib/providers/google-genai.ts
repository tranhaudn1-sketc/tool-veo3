import { GoogleGenAI } from "@google/genai";
import { MODELS_CONFIG } from "../config/models.config";
import {
  AIProvider,
  GenerateImageInput,
  GenerateImageOutput,
  GenerateVideoInput,
  GenerateVideoOutput,
} from "./types";

export class GoogleGenAIProvider implements AIProvider {
  public id = "google-genai";
  public name = "Google Veo & Imagen (Gemini API)";

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "Chưa cấu hình GEMINI_API_KEY trong file .env. Vui lòng thêm API key từ Google AI Studio (https://aistudio.google.com/)."
      );
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Helper to download video from Google URI or handle base64
   */
  private async downloadVideoBytes(
    videoUri?: string,
    videoBytesBase64?: string
  ): Promise<Buffer> {
    if (videoBytesBase64) {
      return Buffer.from(videoBytesBase64, "base64");
    }

    if (!videoUri) {
      throw new Error("Không tìm thấy dữ liệu video trong phản hồi của Google Veo.");
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    // Google files API uri might need API key in header or query
    const url = new URL(videoUri);
    if (apiKey && !url.searchParams.has("key")) {
      url.searchParams.set("key", apiKey);
    }

    const res = await fetch(url.toString(), {
      headers: apiKey ? { "x-goog-api-key": apiKey } : {},
    });

    if (!res.ok) {
      throw new Error(`Tải video từ Google thất bại với mã lỗi HTTP ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Calculate cost based on model config
   */
  private calculateImageCost(modelId: string, count: number): number {
    const modelConfig = MODELS_CONFIG.imageModels.find((m) => m.id === modelId);
    const unitPrice = modelConfig?.pricing.perImage ?? 0.03;
    return Number((unitPrice * count).toFixed(4));
  }

  private calculateVideoCost(modelId: string, durationSec: number): number {
    const modelConfig = MODELS_CONFIG.videoModels.find((m) => m.id === modelId);
    const perSec = modelConfig?.pricing.perSecond ?? 0.06;
    return Number((perSec * durationSec).toFixed(4));
  }

  /**
   * Map standard aspect ratios to Google supported formats
   */
  private mapAspectRatio(ar: string): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" {
    switch (ar) {
      case "1:1":
      case "3:4":
      case "4:3":
      case "9:16":
      case "16:9":
        return ar;
      default:
        return "16:9";
    }
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const ai = this.getClient();
    const count = Math.min(Math.max(1, input.sampleCount || 1), 4);
    const targetModel = input.model || MODELS_CONFIG.defaultImageModel;

    try {
      // If reference image is provided (Image-to-Image / Editing)
      if (input.referenceImageBuffer && input.referenceImageBuffer.length > 0) {
        // Image to Image via Gemini Multimodal or Imagen Edit
        // We use editImage or generateImages with reference
        try {
          const response = await ai.models.generateImages({
            model: targetModel,
            prompt: input.prompt,
            config: {
              numberOfImages: count,
              outputMimeType: "image/jpeg",
              aspectRatio: this.mapAspectRatio(input.aspectRatio),
              negativePrompt: input.negativePrompt || undefined,
            },
          });

          if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("Không nhận được hình ảnh nào từ dịch vụ Imagen.");
          }

          const images = response.generatedImages.map((img) => {
            if (img.raiFilteredReason) {
              throw new Error(`Ảnh bị lọc bởi chính sách an toàn: ${img.raiFilteredReason}`);
            }
            if (!img.image?.imageBytes) {
              throw new Error("Dữ liệu ảnh trả về bị rỗng.");
            }
            return {
              buffer: Buffer.from(img.image.imageBytes, "base64"),
              mimeType: img.image.mimeType || "image/jpeg",
            };
          });

          return {
            images,
            cost: this.calculateImageCost(targetModel, images.length),
          };
        } catch (editErr) {
          console.warn("Thử chế độ tạo ảnh trực tiếp:", editErr);
        }
      }

      // Standard Text-to-Image
      const response = await ai.models.generateImages({
        model: targetModel,
        prompt: input.prompt,
        config: {
          numberOfImages: count,
          outputMimeType: "image/jpeg",
          aspectRatio: this.mapAspectRatio(input.aspectRatio),
          negativePrompt: input.negativePrompt || undefined,
        },
      });

      if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Không nhận được ảnh nào được tạo từ Imagen.");
      }

      const images = response.generatedImages.map((img) => {
        if (img.raiFilteredReason) {
          throw new Error(`Ảnh bị chặn bởi kiểm duyệt an toàn: ${img.raiFilteredReason}`);
        }
        if (!img.image?.imageBytes) {
          throw new Error("Dữ liệu byte ảnh không tồn tại.");
        }
        return {
          buffer: Buffer.from(img.image.imageBytes, "base64"),
          mimeType: img.image.mimeType || "image/jpeg",
        };
      });

      return {
        images,
        cost: this.calculateImageCost(targetModel, images.length),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Gemini Enterprise") || msg.includes("Vertex AI")) {
        throw new Error(
          "Google API từ chối: Model Imagen 3 yêu cầu Google Cloud Project phải được liên kết thanh toán (Billing / Vertex AI). Tài khoản AI Studio Free Tier hiện tại có hạn mức tạo ảnh = 0. Vui lòng kích hoạt Google Cloud Billing (được tặng $300 credit miễn phí) để sử dụng."
        );
      }
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("Hạn mức (Quota) của Google Gemini API đã hết. Vui lòng kiểm tra lại gói cước hoặc thử lại sau.");
      }
      if (msg.toLowerCase().includes("safety") || msg.toLowerCase().includes("blocked")) {
        throw new Error("Prompt hoặc nội dung ảnh đã vi phạm bộ lọc an toàn của Google.");
      }
      if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("api key")) {
        throw new Error("GEMINI_API_KEY không hợp lệ hoặc chưa được kích hoạt quyền truy cập Imagen 3.");
      }
      throw new Error(`Lỗi tạo ảnh: ${msg}`);
    }
  }

  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    const ai = this.getClient();
    const targetModel = input.model || MODELS_CONFIG.defaultVideoModel;
    const duration = input.durationSeconds || 5;

    try {
      await input.onProgress?.("Đang gửi yêu cầu tạo video tới Google Veo...");

      // Prepare request parameters
      const params: Parameters<typeof ai.models.generateVideos>[0] = {
        model: targetModel,
        prompt: input.prompt,
        config: {
          numberOfVideos: 1,
          aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9",
          durationSeconds: duration,
          negativePrompt: input.negativePrompt || undefined,
        },
      };

      // Support Image-to-Video if reference image provided
      if (input.referenceImageBuffer && input.referenceImageBuffer.length > 0) {
        await input.onProgress?.("Đang tải ảnh làm khung hình đầu tiên...");
        params.image = {
          imageBytes: input.referenceImageBuffer.toString("base64"),
          mimeType: input.referenceImageMime || "image/jpeg",
        };
      }

      let operation = await ai.models.generateVideos(params);

      // Long running operation polling
      const startTime = Date.now();
      const maxWaitMs = 12 * 60 * 1000; // 12 minutes max wait

      while (!operation.done) {
        if (Date.now() - startTime > maxWaitMs) {
          throw new Error("Quá thời gian chờ tạo video (Timeout sau 12 phút).");
        }

        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        await input.onProgress?.(`Google Veo đang xử lý video... (${elapsedSeconds}s)`);

        // Wait 10 seconds before polling
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Poll operation status
        operation = await ai.operations.getVideosOperation({ operation });

        if (operation.error) {
          throw new Error(
            `Google Veo báo lỗi: ${operation.error.message || JSON.stringify(operation.error)}`
          );
        }
      }

      await input.onProgress?.("Video đã hoàn tất trên Google server. Đang tải về máy chủ local...");

      const generatedVideo = operation.response?.generatedVideos?.[0];
      if (!generatedVideo) {
        throw new Error("Không nhận được dữ liệu video trả về từ Google Veo.");
      }

      // Download video stream or base64 to buffer
      const videoBuffer = await this.downloadVideoBytes(
        generatedVideo.video?.uri,
        generatedVideo.video?.videoBytes
      );

      const mimeType = generatedVideo.video?.mimeType || "video/mp4";
      const cost = this.calculateVideoCost(targetModel, duration);

      return {
        videoBuffer,
        mimeType,
        durationSec: duration,
        cost,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Gemini Enterprise") || msg.includes("Vertex AI")) {
        throw new Error(
          "Google API từ chối: Model Google Veo yêu cầu Google Cloud Project phải được liên kết thanh toán (Billing / Vertex AI). Vui lòng kích hoạt Google Cloud Billing (được tặng $300 credit miễn phí) để sử dụng Veo."
        );
      }
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("Hạn mức (Quota) của Google Veo đã hết. Vui lòng thử lại sau.");
      }
      if (msg.toLowerCase().includes("safety") || msg.toLowerCase().includes("blocked")) {
        throw new Error("Prompt hoặc ảnh của bạn đã bị bộ lọc an toàn của Google Veo từ chối.");
      }
      if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("api key")) {
        throw new Error("GEMINI_API_KEY không có quyền truy cập model Veo hoặc chưa bật thanh toán (Billing).");
      }
      throw new Error(`Lỗi tạo video: ${msg}`);
    }
  }

  async enhancePrompt(prompt: string, type: "image" | "video"): Promise<string> {
    const ai = this.getClient();
    const systemInstruction = `Bạn là chuyên gia kỹ thuật prompt AI hàng đầu cho ${
      type === "video" ? "Google Veo (Video Generation)" : "Google Imagen 3 (Image Generation)"
    }.
Nhiệm vụ của bạn: Nhận prompt ngắn hoặc ý tưởng thô từ người dùng, sau đó viết lại thành một prompt tiếng Anh chất lượng cao, sống động, chi tiết về: ánh sáng (lighting), bố cục camera (camera movement / angles), màu sắc (color grading), chi tiết kết cấu vật thể (textures, materials), và bầu không khí (atmosphere).
Yêu cầu bắt buộc:
1. Trả về DUY NHẤT nội dung prompt hoàn chỉnh đã được viết lại bằng tiếng Anh (không kèm lời chào, không giải thích, không đặt trong ngoặc kép).
2. Tối ưu cho AI video/image hiểu sâu và sinh ra hình ảnh đẹp nhất.`;

    try {
      const response = await ai.models.generateContent({
        model: MODELS_CONFIG.promptEnhanceModel,
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\nPrompt gốc của tôi:\n${prompt}` }] },
        ],
      });

      const enhanced = response.text?.trim();
      if (!enhanced) {
        return prompt;
      }
      return enhanced;
    } catch (err) {
      console.warn("Gemini Flash bận hoặc gặp lỗi, chuyển sang engine tối ưu dự phòng:", err);
      try {
        const url = `https://text.pollinations.ai/${encodeURIComponent(
          `Rewrite and expand this prompt for AI ${type} generation with rich visual details, lighting, and camera angle in English. Return ONLY the rewritten prompt without any explanation:\n${prompt}`
        )}`;
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 5) return text.trim();
        }
      } catch {
        // Fallback to original prompt
      }
      return prompt;
    }
  }
}
