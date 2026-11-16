import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { jobQueue } from "@/lib/queue";
import { storageProvider } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const { id } = params;
    const generation = await prisma.generation.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Không tìm thấy tác phẩm." },
        { status: 404 }
      );
    }

    const progress = jobQueue.getJobProgress(generation.id);

    return NextResponse.json({
      generation: {
        ...generation,
        currentProgress: progress,
        assets: generation.assets.map((asset) => ({
          ...asset,
          url: storageProvider.getAssetUrl(asset.filePath),
          thumbnailUrl: asset.thumbnailPath
            ? storageProvider.getAssetUrl(asset.thumbnailPath)
            : storageProvider.getAssetUrl(asset.filePath),
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi lấy thông tin tác phẩm";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();

    const generation = await prisma.generation.findUnique({
      where: { id },
    });

    if (!generation) {
      return NextResponse.json({ error: "Không tìm thấy mục." }, { status: 404 });
    }

    const updated = await prisma.generation.update({
      where: { id },
      data: {
        isFavorite:
          typeof body.isFavorite === "boolean"
            ? body.isFavorite
            : !generation.isFavorite,
      },
    });

    return NextResponse.json({ success: true, generation: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi cập nhật mục";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const { id } = params;
    const generation = await prisma.generation.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!generation) {
      return NextResponse.json({ error: "Không tìm thấy mục cần xoá." }, { status: 404 });
    }

    // Nếu job đang queued, huỷ nó
    if (generation.status === "queued") {
      await jobQueue.cancelJob(generation.id);
      return NextResponse.json({ success: true, message: "Đã huỷ job trong hàng đợi." });
    }

    // Xoá file assets vật lý khỏi disk
    for (const asset of generation.assets) {
      if (asset.filePath) {
        await storageProvider.delete(asset.filePath);
      }
      if (asset.thumbnailPath && asset.thumbnailPath !== asset.filePath) {
        await storageProvider.delete(asset.thumbnailPath);
      }
    }

    // Xoá record khỏi DB (Cascade xoá Asset và UsageLog relation)
    await prisma.generation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xoá tác phẩm thành công.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi xoá tác phẩm";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
