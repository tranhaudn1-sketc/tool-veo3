import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import type {
  FileStatResult,
  FileStreamResult,
  StorageCategory,
  StorageProvider,
} from "./types";

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    // Default to ./storage relative to project root
    this.baseDir = baseDir
      ? path.resolve(baseDir)
      : path.join(process.cwd(), process.env.STORAGE_DIR || "storage");
    this.ensureBaseDirectories();
  }

  private ensureBaseDirectories(): void {
    const categories: StorageCategory[] = [
      "images",
      "videos",
      "thumbnails",
      "uploads",
    ];
    for (const cat of categories) {
      const dirPath = path.join(this.baseDir, cat);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  private getNormalizedPath(relativeKey: string): string {
    // Sanitize path to prevent directory traversal
    const safeKey = relativeKey.replace(/^[/\\]+/, "").replace(/\.\.[/\\]/g, "");
    const parts = safeKey.split(/[/\\]/);
    return path.join(this.baseDir, ...parts);
  }

  private detectMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".mp4":
        return "video/mp4";
      case ".webm":
        return "video/webm";
      case ".json":
        return "application/json";
      default:
        return "application/octet-stream";
    }
  }

  async save(
    category: StorageCategory,
    fileName: string,
    data: Buffer | Uint8Array,
    _mimeType?: string
  ): Promise<string> {
    const targetDir = path.join(this.baseDir, category);
    if (!fs.existsSync(targetDir)) {
      await fsp.mkdir(targetDir, { recursive: true });
    }

    const cleanName = path.basename(fileName);
    const fullPath = path.join(targetDir, cleanName);
    await fsp.writeFile(fullPath, data);

    // Return normalized relative key with forward slashes for URL matching
    return `${category}/${cleanName}`;
  }

  async read(relativeKey: string): Promise<Buffer> {
    const fullPath = this.getNormalizedPath(relativeKey);
    return await fsp.readFile(fullPath);
  }

  async getStream(
    relativeKey: string,
    range?: { start: number; end: number }
  ): Promise<FileStreamResult> {
    const fullPath = this.getNormalizedPath(relativeKey);
    const stats = await fsp.stat(fullPath);
    const totalSize = stats.size;
    const mimeType = this.detectMimeType(fullPath);

    if (range) {
      const start = Math.max(0, range.start);
      const end = Math.min(range.end, totalSize - 1);
      const stream = fs.createReadStream(fullPath, { start, end });
      return { stream, totalSize, mimeType, start, end };
    }

    const stream = fs.createReadStream(fullPath);
    return { stream, totalSize, mimeType };
  }

  async delete(relativeKey: string): Promise<boolean> {
    try {
      const fullPath = this.getNormalizedPath(relativeKey);
      if (fs.existsSync(fullPath)) {
        await fsp.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async exists(relativeKey: string): Promise<boolean> {
    try {
      const fullPath = this.getNormalizedPath(relativeKey);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }

  async stat(relativeKey: string): Promise<FileStatResult | null> {
    try {
      const fullPath = this.getNormalizedPath(relativeKey);
      const stat = await fsp.stat(fullPath);
      return {
        size: stat.size,
        mimeType: this.detectMimeType(fullPath),
        updatedAt: stat.mtime,
      };
    } catch {
      return null;
    }
  }

  getAssetUrl(relativeKey: string): string {
    const cleanKey = relativeKey.replace(/^[/\\]+/, "").split(/[/\\]/).join("/");
    return `/api/assets/${cleanKey}`;
  }

  getAbsolutePath(relativeKey: string): string {
    return this.getNormalizedPath(relativeKey);
  }
}

// Singleton storage provider export
export const storageProvider: StorageProvider = new LocalStorageProvider();
