import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/providers";
import { EnhancePromptSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = EnhancePromptSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Tham số không hợp lệ" },
        { status: 400 }
      );
    }

    const { prompt, type } = result.data;
    const provider = getAIProvider("google-genai");
    const enhanced = await provider.enhancePrompt(prompt, type);

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      enhancedPrompt: enhanced,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi tối ưu prompt";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
