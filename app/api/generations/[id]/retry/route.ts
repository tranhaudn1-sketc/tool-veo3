import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { jobQueue } from "@/lib/queue";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const { id } = params;
    const success = await jobQueue.retryJob(id);

    if (!success) {
      return NextResponse.json(
        { error: "Chỉ có thể thử lại các tác phẩm ở trạng thái Thất bại hoặc Đã huỷ." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã đưa tác phẩm trở lại hàng đợi xử lý.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi thử lại tác phẩm";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
