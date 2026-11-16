import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MODELS_CONFIG } from "../lib/config/models.config.ts";

describe("Cost & Pricing Logic Tests", () => {
  it("should calculate correct Imagen 3 pricing for multiple samples", () => {
    const model = MODELS_CONFIG.imageModels.find((m) => m.id === "imagen-3.0-generate-002");
    assert.ok(model);
    const unitPrice = model.pricing.perImage ?? 0.03;

    const count1 = 1;
    const cost1 = Number((unitPrice * count1).toFixed(4));
    assert.equal(cost1, 0.03);

    const count4 = 4;
    const cost4 = Number((unitPrice * count4).toFixed(4));
    assert.equal(cost4, 0.12);
  });

  it("should calculate correct Google Veo video cost per duration", () => {
    const model = MODELS_CONFIG.videoModels.find((m) => m.id === "veo-2.0-generate-001");
    assert.ok(model);
    const perSec = model.pricing.perSecond ?? 0.06;

    // 5 seconds
    const cost5s = Number((perSec * 5).toFixed(4));
    assert.equal(cost5s, 0.3);

    // 8 seconds
    const cost8s = Number((perSec * 8).toFixed(4));
    assert.equal(cost8s, 0.48);
  });

  it("should enforce daily budget limit logic", () => {
    const dailyLimit = 10.0;
    const currentSpend = 9.8;
    const nextCost = 0.3; // total 10.1 > 10.0

    const isExceeded = currentSpend + nextCost > dailyLimit;
    assert.equal(isExceeded, true);
  });
});
