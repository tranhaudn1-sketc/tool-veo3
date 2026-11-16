import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { LocalStorageProvider } from "../lib/storage/local-storage.ts";

describe("Storage Abstraction Tests", () => {
  const testStorageDir = path.join(process.cwd(), "storage_test_temp");
  const storage = new LocalStorageProvider(testStorageDir);

  it("should save and read binary buffer correctly", async () => {
    const testData = Buffer.from("Hello Veo3 AI Storage", "utf-8");
    const key = await storage.save("images", "test_file.txt", testData, "text/plain");

    assert.equal(key, "images/test_file.txt");
    assert.equal(await storage.exists(key), true);

    const readData = await storage.read(key);
    assert.equal(readData.toString("utf-8"), "Hello Veo3 AI Storage");

    const stat = await storage.stat(key);
    assert.ok(stat);
    assert.equal(stat.size, testData.length);

    // Format URL check
    assert.equal(storage.getAssetUrl(key), "/api/assets/images/test_file.txt");

    // Clean up
    await storage.delete(key);
    assert.equal(await storage.exists(key), false);

    // Remove temp test folder
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });
});
