import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { storageProvider } from "@/lib/storage";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Không tìm thấy tệp đính kèm trong yêu cầu." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Định dạng không được hỗ trợ. Vui lòng tải ảnh JPG, PNG hoặc WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Kích thước tệp vượt quá giới hạn 15MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tạo tên tệp độc nhất
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const storagePath = await storageProvider.save("uploads", fileName, buffer, file.type);
    const url = storageProvider.getAssetUrl(storagePath);

    return NextResponse.json({
      success: true,
      storagePath,
      url,
      sizeBytes: file.size,
      mimeType: file.type,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi tải tệp lên";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
