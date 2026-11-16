import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { isAuthenticated } from "@/lib/auth/session";
import { MODELS_CONFIG } from "@/lib/config/models.config";
import { checkDailyBudgetLimit } from "@/lib/cost/calculator";
import { prisma } from "@/lib/db";
import { jobQueue } from "@/lib/queue";
import { storageProvider } from "@/lib/storage";
import { CreateImageSchema, CreateVideoSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "image" | "video" | null
    const status = searchParams.get("status"); // "all" | "completed" | "processing" | "failed" | "queued"
    const favorite = searchParams.get("favorite"); // "true" | null
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (type && type !== "all") {
      where.type = type;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (favorite === "true") {
      where.isFavorite = true;
    }

    if (search && search.trim()) {
      where.prompt = {
        contains: search.trim(),
      };
    }

    const [total, items] = await Promise.all([
      prisma.generation.count({ where }),
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          assets: true,
        },
      }),
    ]);

    // Format asset URLs
    const formattedItems = items.map((item) => {
      const progress = jobQueue.getJobProgress(item.id);
      return {
        ...item,
        currentProgress: progress,
        assets: item.assets.map((asset) => ({
          ...asset,
          url: storageProvider.getAssetUrl(asset.filePath),
          thumbnailUrl: asset.thumbnailPath
            ? storageProvider.getAssetUrl(asset.thumbnailPath)
            : storageProvider.getAssetUrl(asset.filePath),
        })),
      };
    });

    return NextResponse.json({
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi lấy danh sách tác phẩm";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
  }

  // Rate Limiting theo IP
  const ip = req.headers.get("x-forwarded-for") || "local_user";
  const rateLimit = checkRateLimit(ip, 30, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi ${rateLimit.retryAfterSec}s nữa.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const type = body.type === "video" ? "video" : "image";

    let validatedData: Record<string, unknown>;
    let costEstimate = 0;
    let mode = "t2i";

    if (type === "video") {
      const parsed = CreateVideoSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message || "Tham số video không hợp lệ" },
          { status: 400 }
        );
      }
      validatedData = parsed.data;
      mode = validatedData.referenceImagePath ? "i2v" : "t2v";

      const modelCfg = MODELS_CONFIG.videoModels.find((m) => m.id === validatedData.model);
      const perSec = modelCfg?.pricing.perSecond ?? 0.06;
      costEstimate = Number((perSec * Number(validatedData.durationSeconds)).toFixed(4));
    } else {
      const parsed = CreateImageSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message || "Tham số ảnh không hợp lệ" },
          { status: 400 }
        );
      }
      validatedData = parsed.data;
      mode = validatedData.referenceImagePath ? "i2i" : "t2i";

      const modelCfg = MODELS_CONFIG.imageModels.find((m) => m.id === validatedData.model);
      const unit = modelCfg?.pricing.perImage ?? 0.03;
      costEstimate = Number((unit * Number(validatedData.sampleCount)).toFixed(4));
    }

    // Kiểm tra ngân sách chi tiêu hàng ngày
    const budgetCheck = await checkDailyBudgetLimit(costEstimate);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: `Đã vượt hạn mức ngân sách ngày ($${budgetCheck.dailyLimit.toFixed(
            2
          )}). Hôm nay bạn đã dùng $${budgetCheck.currentTodaySpend.toFixed(
            2
          )}. Hãy nâng hạn mức trong Cài đặt nếu muốn tiếp tục tạo.`,
        },
        { status: 403 }
      );
    }

    // Tạo record Generation trong DB
    const generation = await prisma.generation.create({
      data: {
        type,
        mode,
        prompt: validatedData.prompt as string,
        negativePrompt: (validatedData.negativePrompt as string) || null,
        model: validatedData.model as string,
        params: JSON.stringify(validatedData),
        status: "queued",
        costEstimate,
      },
    });

    // Kích hoạt worker xử lý ngay
    jobQueue.triggerNext();

    return NextResponse.json(
      {
        success: true,
        generation: {
          ...generation,
          assets: [],
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi khi tạo yêu cầu";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
