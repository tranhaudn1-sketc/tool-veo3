interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Tự động dọn dẹp các mục hết hạn mỗi 60 giây
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

/**
 * Kiểm tra giới hạn tần suất yêu cầu (Rate Limit)
 * @param identifier IP hoặc Session Identifier
 * @param maxRequests Số yêu cầu tối đa
 * @param windowMs Khung thời gian (miligiây)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests = 20,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}
