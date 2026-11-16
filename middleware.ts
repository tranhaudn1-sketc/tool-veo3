import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const DEFAULT_SECRET = "default_secret_key_change_in_production_min32chars";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret.padEnd(32, "#").slice(0, 32));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Công khai các route tĩnh và route xác thực
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/login" ||
    pathname === "/api/auth/login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("veo3_session")?.value;

  let isValid = false;
  if (token) {
    try {
      const secretKey = getSecretKey();
      const { payload } = await jwtVerify(token, secretKey);
      if (payload.authenticated === true) {
        isValid = true;
      }
    } catch {
      isValid = false;
    }
  }

  // Nếu chưa đăng nhập
  if (!isValid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Chưa xác thực. Vui lòng đăng nhập." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
