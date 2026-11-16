import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import path from "path";
import { isAuthenticated } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { storageProvider } from "@/lib/storage";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const ids: string[] = body.ids || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất 1 tác phẩm để tải về." },
        { status: 400 }
      );
    }

    const generations = await prisma.generation.findMany({
      where: { id: { in: ids } },
      include: { assets: true },
    });

    const zip = new JSZip();
    let fileCount = 0;

    for (const gen of generations) {
      for (let i = 0; i < gen.assets.length; i++) {
        const asset = gen.assets[i];
        if (await storageProvider.exists(asset.filePath)) {
          const buffer = await storageProvider.read(asset.filePath);
          const ext = path.extname(asset.filePath) || (gen.type === "video" ? ".mp4" : ".jpg");
          const safePrompt = gen.prompt.slice(0, 30).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, "_");
          const fileName = `${gen.type}_${safePrompt}_${gen.id.slice(0, 6)}_${i + 1}${ext}`;
          zip.file(fileName, buffer);
          fileCount++;
        }
      }
    }

    if (fileCount === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy tệp phương tiện nào để đóng gói ZIP." },
        { status: 404 }
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="veo3_creations_${Date.now()}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi nén tệp ZIP";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
