import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "./secrets";

describe("secrets", () => {
  it("round-trips with the same secret", () => {
    const enc = encryptSecret("sk-ant-api03-abcdef123456", "app-secret");
    expect(enc).not.toContain("abcdef");
    expect(decryptSecret(enc, "app-secret")).toBe("sk-ant-api03-abcdef123456");
  });

  it("returns null with the wrong secret or garbage", () => {
    const enc = encryptSecret("value", "one");
    expect(decryptSecret(enc, "two")).toBeNull();
    expect(decryptSecret("nope", "one")).toBeNull();
  });

  it("masks keys", () => {
    expect(maskSecret("sk-ant-api03-abcdef123456")).toBe("sk-ant-…3456");
    expect(maskSecret("short")).toBe("••••");
  });
});
