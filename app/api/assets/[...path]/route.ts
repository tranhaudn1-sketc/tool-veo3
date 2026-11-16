import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { storageProvider } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Kiểm tra xác thực session
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const relativeKey = params.path.join("/");
    const exists = await storageProvider.exists(relativeKey);

    if (!exists) {
      return NextResponse.json(
        { error: "Tệp không tồn tại hoặc đã bị xoá." },
        { status: 404 }
      );
    }

    const rangeHeader = req.headers.get("range");

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      // Hỗ trợ HTTP Range Request cho video streaming / seeking
      const stat = await storageProvider.stat(relativeKey);
      if (!stat) {
        return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
      }

      const totalSize = stat.size;
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      const streamResult = await storageProvider.getStream(relativeKey, {
        start,
        end,
      });

      const chunkSize = end - start + 1;
      const headers = new Headers({
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": streamResult.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      });

      // Chuyển đổi Node stream sang ReadableStream của Web API
      const webStream = new ReadableStream({
        start(controller) {
          streamResult.stream.on("data", (chunk) => controller.enqueue(chunk));
          streamResult.stream.on("end", () => controller.close());
          streamResult.stream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers,
      });
    }

    // Tải toàn bộ tệp (ảnh hoặc thumbnail)
    const stat = await storageProvider.stat(relativeKey);
    const streamResult = await storageProvider.getStream(relativeKey);

    const headers = new Headers({
      "Content-Type": streamResult.mimeType,
      "Content-Length": (stat?.size || streamResult.totalSize).toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    });

    const webStream = new ReadableStream({
      start(controller) {
        streamResult.stream.on("data", (chunk) => controller.enqueue(chunk));
        streamResult.stream.on("end", () => controller.close());
        streamResult.stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi phục vụ tệp";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
