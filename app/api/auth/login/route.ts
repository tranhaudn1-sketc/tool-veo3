import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth/session";
import { LoginSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = LoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { password } = result.data;
    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    await setSessionCookie();
    return NextResponse.json({ success: true, message: "Đăng nhập thành công" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Lỗi xử lý đăng nhập";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
