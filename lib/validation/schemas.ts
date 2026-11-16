import { z } from "zod";

export const CreateImageSchema = z.object({
  prompt: z
    .string()
    .min(1, "Vui lòng nhập nội dung mô tả prompt.")
    .max(2000, "Prompt không được vượt quá 2000 ký tự."),
  negativePrompt: z.string().max(1000).optional().nullable(),
  model: z.string().min(1, "Vui lòng chọn model tạo ảnh."),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
  sampleCount: z.number().int().min(1).max(4).default(1),
  seed: z.number().int().optional().nullable(),
  referenceImagePath: z.string().optional().nullable(),
});

export const CreateVideoSchema = z.object({
  prompt: z
    .string()
    .min(1, "Vui lòng nhập nội dung mô tả prompt cho video.")
    .max(2000, "Prompt không được vượt quá 2000 ký tự."),
  negativePrompt: z.string().max(1000).optional().nullable(),
  model: z.string().min(1, "Vui lòng chọn model tạo video."),
  aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
  durationSeconds: z.number().int().refine((val) => [5, 8].includes(val), {
    message: "Thời lượng video chỉ hỗ trợ 5 hoặc 8 giây.",
  }).default(5),
  resolution: z.enum(["720p", "1080p"]).default("720p"),
  enableAudio: z.boolean().default(false),
  seed: z.number().int().optional().nullable(),
  referenceImagePath: z.string().optional().nullable(),
});

export const EnhancePromptSchema = z.object({
  prompt: z
    .string()
    .min(1, "Vui lòng nhập prompt cần cải thiện.")
    .max(2000, "Prompt quá dài để tối ưu."),
  type: z.enum(["image", "video"]).default("image"),
});

export const LoginSchema = z.object({
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const DailyLimitSchema = z.object({
  limit: z.number().min(0.5, "Hạn mức tối thiểu là $0.50.").max(500, "Hạn mức tối đa là $500.00."),
});

export const BatchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "Danh sách xoá phải có ít nhất 1 mục."),
});
