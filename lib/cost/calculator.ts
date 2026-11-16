import { MODELS_CONFIG } from "../config/models.config";
import { prisma } from "../db";

const SETTING_DAILY_LIMIT_KEY = "daily_spend_limit_usd";

export interface CostSummary {
  todayCost: number;
  weekCost: number;
  monthCost: number;
  allTimeCost: number;
  totalGenerations: number;
  successRate: number;
  imagesCount: number;
  videosCount: number;
  dailyLimit: number;
  isDailyLimitExceeded: boolean;
}

/**
 * Lấy hạn mức chi tiêu mỗi ngày hiện tại (mặc định lấy từ models.config.ts)
 */
export async function getDailySpendLimit(): Promise<number> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: SETTING_DAILY_LIMIT_KEY },
    });
    if (setting) {
      const val = parseFloat(setting.value);
      if (!isNaN(val)) return val;
    }
  } catch {
    // Fallback nếu DB lỗi
  }
  return MODELS_CONFIG.defaultDailyLimitUSD;
}

/**
 * Cập nhật hạn mức chi tiêu mỗi ngày
 */
export async function setDailySpendLimit(limit: number): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SETTING_DAILY_LIMIT_KEY },
    update: { value: limit.toString() },
    create: { key: SETTING_DAILY_LIMIT_KEY, value: limit.toString() },
  });
}

/**
 * Kiểm tra xem ngày hôm nay đã vượt quá hạn mức chi tiêu chưa
 */
export async function checkDailyBudgetLimit(nextCostEstimate = 0): Promise<{
  allowed: boolean;
  currentTodaySpend: number;
  dailyLimit: number;
}> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyLimit = await getDailySpendLimit();

  const logs = await prisma.usageLog.findMany({
    where: { date: todayStr },
  });

  const currentTodaySpend = logs.reduce((sum, item) => sum + item.cost, 0);

  if (currentTodaySpend + nextCostEstimate > dailyLimit) {
    return {
      allowed: false,
      currentTodaySpend: Number(currentTodaySpend.toFixed(3)),
      dailyLimit,
    };
  }

  return {
    allowed: true,
    currentTodaySpend: Number(currentTodaySpend.toFixed(3)),
    dailyLimit,
  };
}

/**
 * Thống kê tổng hợp chi phí cho trang Dashboard / Usage
 */
export async function getCostAnalytics(): Promise<CostSummary> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // 7 ngày gần nhất
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  // 30 ngày gần nhất
  const monthAgo = new Date();
  monthAgo.setDate(now.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().slice(0, 10);

  const [allLogs, allGenerations, dailyLimit] = await Promise.all([
    prisma.usageLog.findMany(),
    prisma.generation.findMany({
      select: { id: true, type: true, status: true, costEstimate: true, createdAt: true },
    }),
    getDailySpendLimit(),
  ]);

  let todayCost = 0;
  let weekCost = 0;
  let monthCost = 0;
  let allTimeCost = 0;

  for (const log of allLogs) {
    allTimeCost += log.cost;
    if (log.date === todayStr) {
      todayCost += log.cost;
    }
    if (log.date >= weekAgoStr) {
      weekCost += log.cost;
    }
    if (log.date >= monthAgoStr) {
      monthCost += log.cost;
    }
  }

  const totalGenerations = allGenerations.length;
  const completedCount = allGenerations.filter((g) => g.status === "completed").length;
  const successRate = totalGenerations > 0 ? Math.round((completedCount / totalGenerations) * 100) : 100;

  const imagesCount = allGenerations.filter((g) => g.type === "image").length;
  const videosCount = allGenerations.filter((g) => g.type === "video").length;

  return {
    todayCost: Number(todayCost.toFixed(3)),
    weekCost: Number(weekCost.toFixed(3)),
    monthCost: Number(monthCost.toFixed(3)),
    allTimeCost: Number(allTimeCost.toFixed(3)),
    totalGenerations,
    successRate,
    imagesCount,
    videosCount,
    dailyLimit,
    isDailyLimitExceeded: todayCost >= dailyLimit,
  };
}
