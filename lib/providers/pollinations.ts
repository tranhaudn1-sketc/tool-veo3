import type {
  AIProvider,
  GenerateImageInput,
  GenerateImageOutput,
  GenerateVideoInput,
  GenerateVideoOutput,
} from "./types";

export class PollinationsProvider implements AIProvider {
  public id = "pollinations";
  public name = "FLUX.1 & Open AI (Miễn phí 100% - Không cần key)";

  private getDimensions(aspectRatio: string): { width: number; height: number } {
    switch (aspectRatio) {
      case "16:9":
        return { width: 1280, height: 720 };
      case "9:16":
        return { width: 720, height: 1280 };
      case "4:3":
        return { width: 1024, height: 768 };
      case "3:4":
        return { width: 768, height: 1024 };
      case "1:1":
      default:
        return { width: 1024, height: 1024 };
    }
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const { width, height } = this.getDimensions(input.aspectRatio);
    const count = Math.min(Math.max(1, input.sampleCount || 1), 4);
    const results = [];

    // Model: flux or turbo
    const targetModel = input.model?.includes("turbo") ? "turbo" : "flux";

    for (let i = 0; i < count; i++) {
      const seed = input.seed ? input.seed + i : Math.floor(Math.random() * 1000000);
      let fullPrompt = input.prompt;
      if (input.negativePrompt) {
        fullPrompt += ` (avoid: ${input.negativePrompt})`;
      }

      const encodedPrompt = encodeURIComponent(fullPrompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${targetModel}&seed=${seed}&nologo=true&enhance=false`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Veo3Studio/1.0",
        },
      });

      if (!res.ok) {
        throw new Error(`Máy chủ tạo ảnh miễn phí báo lỗi HTTP ${res.status}: ${res.statusText}`);
      }

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (buffer.length < 1000) {
        throw new Error("Dữ liệu ảnh trả về từ máy chủ không hợp lệ.");
      }

      results.push({
        buffer,
        mimeType: "image/jpeg",
        width,
        height,
      });
    }

    return {
      images: results,
      cost: 0.0, // Hoàn toàn miễn phí
    };
  }

  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    await input.onProgress?.("Đang kết nối máy chủ tạo video miễn phí...");
    const { width, height } = this.getDimensions(input.aspectRatio);
    const seed = input.seed || Math.floor(Math.random() * 1000000);

    // Pollinations image-to-motion or short video endpoint
    const encodedPrompt = encodeURIComponent(input.prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Không thể khởi tạo khung hình video từ máy chủ.");
    }

    const imageBuf = Buffer.from(await res.arrayBuffer());

    // Tạo video 5 giây từ hình ảnh sinh ra bằng ffmpeg-static
    await input.onProgress?.("Đang render video chuyển động mượt mà...");
    const { generateVideoFromImage } = await import("../media/video-builder");
    const videoBuffer = await generateVideoFromImage(imageBuf, input.durationSeconds || 5);

    return {
      videoBuffer,
      mimeType: "video/mp4",
      durationSec: input.durationSeconds || 5,
      cost: 0.0, // Miễn phí
    };
  }

  async enhancePrompt(prompt: string, _type: "image" | "video"): Promise<string> {
    try {
      const url = `https://text.pollinations.ai/${encodeURIComponent(
        `Rewrite and expand this prompt for AI image/video generation with rich visual details, lighting, and camera angle in English. Return ONLY the rewritten prompt without any explanation:\n${prompt}`
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        return text.trim() || prompt;
      }
    } catch {
      // Fallback
    }
    return prompt;
  }
}
