import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "veo3_session";
const DEFAULT_SECRET = "default_secret_key_change_in_production_min32chars";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret.padEnd(32, "#").slice(0, 32));
}

export interface SessionPayload {
  authenticated: boolean;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Tạo token JWT phiên đăng nhập có thời hạn 30 ngày
 */
export async function createSessionToken(): Promise<string> {
  const secretKey = getSecretKey();
  return await new SignJWT({ authenticated: true, role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

/**
 * Xác thực token JWT
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.authenticated === true) {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Đặt cookie đăng nhập
 */
export async function setSessionCookie(): Promise<string> {
  const token = await createSessionToken();
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  });
  return token;
}

/**
 * Xoá cookie khi đăng xuất
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Kiểm tra xem request hiện tại đã đăng nhập chưa (cho Server Components & Route Handlers)
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  const payload = await verifySessionToken(token);
  return payload !== null;
}

/**
 * Kiểm tra mật khẩu do user cung cấp
 */
export function verifyPassword(password: string): boolean {
  const expectedPassword = process.env.APP_PASSWORD?.trim();
  if (!expectedPassword) {
    // Nếu chưa set mật khẩu thì mặc định admin123456
    return password === "admin123456";
  }
  return password === expectedPassword;
}
