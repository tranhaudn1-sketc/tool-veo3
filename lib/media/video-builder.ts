import { execFile } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require("ffmpeg-static");
    if (ffmpeg && fs.existsSync(ffmpeg)) {
      return ffmpeg;
    }
  } catch {
    // Fall back to PATH
  }
  return "ffmpeg";
}

/**
 * Tạo video clip MP4 chuyển động (Ken Burns zoom effect) từ ảnh và thời lượng
 */
export async function generateVideoFromImage(
  imageBuffer: Buffer,
  durationSeconds = 5
): Promise<Buffer> {
  const tempDir = path.join(process.cwd(), "storage", "temp");
  if (!fs.existsSync(tempDir)) {
    await fsp.mkdir(tempDir, { recursive: true });
  }

  const tempImgPath = path.join(tempDir, `temp_${Date.now()}_img.jpg`);
  const tempVideoPath = path.join(tempDir, `temp_${Date.now()}_vid.mp4`);

  try {
    await fsp.writeFile(tempImgPath, imageBuffer);
    const ffmpegBin = getFfmpegPath();

    // Zoom nhẹ 1.0 -> 1.05 tạo chuyển động điện ảnh mượt mà
    const args = [
      "-y",
      "-loop",
      "1",
      "-i",
      tempImgPath,
      "-c:v",
      "libx264",
      "-t",
      durationSeconds.toString(),
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0008,1.15)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720",
      "-r",
      "25",
      tempVideoPath,
    ];

    await execFileAsync(ffmpegBin, args, { timeout: 30000 });

    if (!fs.existsSync(tempVideoPath)) {
      throw new Error("Không thể tạo tệp video đầu ra.");
    }

    const videoBuffer = await fsp.readFile(tempVideoPath);
    return videoBuffer;
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempImgPath)) await fsp.unlink(tempImgPath);
      if (fs.existsSync(tempVideoPath)) await fsp.unlink(tempVideoPath);
    } catch {
      // Ignore cleanup error
    }
  }
}
