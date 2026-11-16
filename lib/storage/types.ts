import { Readable } from "stream";

export type StorageCategory = "images" | "videos" | "thumbnails" | "uploads";

export interface FileStreamResult {
  stream: Readable;
  totalSize: number;
  mimeType: string;
  start?: number;
  end?: number;
}

export interface FileStatResult {
  size: number;
  mimeType: string;
  updatedAt: Date;
}

export interface StorageProvider {
  /**
   * Save a buffer or binary data into storage category
   * @returns relative path key (e.g., 'images/img_123.jpg')
   */
  save(
    category: StorageCategory,
    fileName: string,
    data: Buffer | Uint8Array,
    mimeType?: string
  ): Promise<string>;

  /**
   * Read full file buffer
   */
  read(relativeKey: string): Promise<Buffer>;

  /**
   * Open readable stream with optional HTTP Range support (crucial for video seeking)
   */
  getStream(
    relativeKey: string,
    range?: { start: number; end: number }
  ): Promise<FileStreamResult>;

  /**
   * Delete file from storage
   */
  delete(relativeKey: string): Promise<boolean>;

  /**
   * Check if file exists
   */
  exists(relativeKey: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  stat(relativeKey: string): Promise<FileStatResult | null>;

  /**
   * Format the URL that clients use to access the asset
   */
  getAssetUrl(relativeKey: string): string;

  /**
   * Get absolute disk path (useful for ffmpeg execution)
   */
  getAbsolutePath(relativeKey: string): string;
}
