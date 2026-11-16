import { execFile } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Resolves ffmpeg static path safely
function getFfmpegPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require("ffmpeg-static");
    if (ffmpeg && fs.existsSync(ffmpeg)) {
      return ffmpeg;
    }
  } catch {
    // Fall back to system PATH
  }
  return "ffmpeg";
}

export interface VideoMetadata {
  durationSec?: number;
  width?: number;
  height?: number;
  thumbnailRelativePath?: string;
}

/**
 * Generate a thumbnail from video at specific timestamp (default 1.0s)
 */
export async function generateVideoThumbnail(
  videoAbsolutePath: string,
  outputThumbnailAbsolutePath: string,
  timestampSec = 1.0
): Promise<boolean> {
  const ffmpegBin = getFfmpegPath();
  if (!ffmpegBin) {
    return false;
  }

  // Ensure output directory exists
  const targetDir = path.dirname(outputThumbnailAbsolutePath);
  if (!fs.existsSync(targetDir)) {
    await fsp.mkdir(targetDir, { recursive: true });
  }

  try {
    // ffmpeg -ss 1.0 -i input.mp4 -vframes 1 -q:v 2 -y output.jpg
    const args = [
      "-y",
      "-ss",
      timestampSec.toFixed(2),
      "-i",
      videoAbsolutePath,
      "-vframes",
      "1",
      "-q:v",
      "2",
      outputThumbnailAbsolutePath,
    ];

    await execFileAsync(ffmpegBin, args, { timeout: 15000 });
    return fs.existsSync(outputThumbnailAbsolutePath);
  } catch (err) {
    console.warn("Lưu ý: Không thể trích xuất thumbnail bằng ffmpeg:", err);
    return false;
  }
}

/**
 * Creates an SVG/Canvas based fallback poster if ffmpeg is unavailable
 */
export async function createFallbackPoster(
  outputAbsolutePath: string,
  title: string
): Promise<void> {
  const targetDir = path.dirname(outputAbsolutePath);
  if (!fs.existsSync(targetDir)) {
    await fsp.mkdir(targetDir, { recursive: true });
  }

  // Generate lightweight high-quality SVG poster
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1e1b4b;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#312e81;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)" />
    <circle cx="640" cy="360" r="50" fill="rgba(147, 51, 234, 0.4)" />
    <polygon points="630,340 660,360 630,380" fill="#ffffff" />
    <text x="640" y="460" font-family="sans-serif" font-size="28" fill="#e2e8f0" text-anchor="middle" font-weight="600">
      ${title.replace(/[<>&"]/g, "")}
    </text>
  </svg>`;

  await fsp.writeFile(outputAbsolutePath, Buffer.from(svg, "utf-8"));
}
