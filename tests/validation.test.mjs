import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CreateImageSchema,
  CreateVideoSchema,
  DailyLimitSchema,
  EnhancePromptSchema,
} from "../lib/validation/schemas.ts";

describe("Input Validation Tests (Zod)", () => {
  it("should validate valid Image parameters", () => {
    const valid = {
      prompt: "A photorealistic cat in space",
      negativePrompt: "blurry",
      model: "imagen-3.0-generate-002",
      aspectRatio: "16:9",
      sampleCount: 2,
    };
    const res = CreateImageSchema.safeParse(valid);
    assert.equal(res.success, true);
  });

  it("should reject Image request without prompt", () => {
    const invalid = {
      prompt: "",
      model: "imagen-3.0-generate-002",
      aspectRatio: "1:1",
    };
    const res = CreateImageSchema.safeParse(invalid);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.match(res.error.errors[0].message, /prompt/i);
    }
  });

  it("should validate valid Video parameters", () => {
    const valid = {
      prompt: "Drone flying over mountains",
      model: "veo-2.0-generate-001",
      aspectRatio: "16:9",
      durationSeconds: 5,
      resolution: "720p",
      enableAudio: true,
    };
    const res = CreateVideoSchema.safeParse(valid);
    assert.equal(res.success, true);
  });

  it("should reject Video with unsupported duration", () => {
    const invalid = {
      prompt: "Drone flying over mountains",
      model: "veo-2.0-generate-001",
      aspectRatio: "16:9",
      durationSeconds: 15, // Only 5 or 8 supported
    };
    const res = CreateVideoSchema.safeParse(invalid);
    assert.equal(res.success, false);
  });

  it("should validate Daily Spend Limit ranges", () => {
    assert.equal(DailyLimitSchema.safeParse({ limit: 10 }).success, true);
    assert.equal(DailyLimitSchema.safeParse({ limit: 0.1 }).success, false); // < 0.5
    assert.equal(DailyLimitSchema.safeParse({ limit: 1000 }).success, false); // > 500
  });

  it("should validate Enhance Prompt request", () => {
    assert.equal(
      EnhancePromptSchema.safeParse({ prompt: "A kitten", type: "video" }).success,
      true
    );
    assert.equal(
      EnhancePromptSchema.safeParse({ prompt: "", type: "image" }).success,
      false
    );
  });
});
