import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { storageProvider } from "@/lib/storage";
import { BatchDeleteSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = BatchDeleteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Danh sách không hợp lệ" },
        { status: 400 }
      );
    }

    const { ids } = result.data;

    const generations = await prisma.generation.findMany({
      where: { id: { in: ids } },
      include: { assets: true },
    });

    for (const gen of generations) {
      for (const asset of gen.assets) {
        if (asset.filePath) {
          await storageProvider.delete(asset.filePath);
        }
        if (asset.thumbnailPath && asset.thumbnailPath !== asset.filePath) {
          await storageProvider.delete(asset.thumbnailPath);
        }
      }
    }

    await prisma.generation.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xoá ${generations.length} tác phẩm thành công.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi xoá hàng loạt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
