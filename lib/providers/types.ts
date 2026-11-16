export interface GenerateImageInput {
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string; // "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
  sampleCount: number; // 1 - 4
  seed?: number;
  referenceImageBuffer?: Buffer;
  referenceImageMime?: string;
}

export interface GeneratedImageResult {
  buffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface GenerateImageOutput {
  images: GeneratedImageResult[];
  cost: number;
}

export interface GenerateVideoInput {
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string; // "16:9" | "9:16"
  durationSeconds: number; // 5 | 8
  resolution: string; // "720p" | "1080p"
  enableAudio?: boolean;
  seed?: number;
  referenceImageBuffer?: Buffer; // For Image-to-Video
  referenceImageMime?: string;
  onProgress?: (statusMessage: string) => Promise<void>;
}

export interface GenerateVideoOutput {
  videoBuffer: Buffer;
  mimeType: string;
  durationSec: number;
  cost: number;
}

export interface AIProvider {
  id: string;
  name: string;
  generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>;
  generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput>;
  enhancePrompt(prompt: string, type: "image" | "video"): Promise<string>;
}
