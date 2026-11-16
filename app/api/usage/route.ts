import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { getCostAnalytics, setDailySpendLimit } from "@/lib/cost/calculator";
import { DailyLimitSchema } from "@/lib/validation/schemas";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const summary = await getCostAnalytics();
    return NextResponse.json({ summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi lấy dữ liệu thống kê";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = DailyLimitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Hạn mức không hợp lệ" },
        { status: 400 }
      );
    }

    await setDailySpendLimit(result.data.limit);
    return NextResponse.json({
      success: true,
      message: `Đã cập nhật hạn mức chi tiêu hàng ngày thành $${result.data.limit.toFixed(2)}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi cập nhật hạn mức";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
