import { describe, expect, it } from "vitest";
import { isAiEnabled } from "@/lib/features";
import { buildRewrites } from "@/lib/rewrites";

describe("NEXT_PUBLIC_ENABLE_AI flag", () => {
  it("is off when unset", () => {
    expect(isAiEnabled({})).toBe(false);
  });

  it("is off for any value other than true", () => {
    expect(isAiEnabled({ NEXT_PUBLIC_ENABLE_AI: "false" })).toBe(false);
    expect(isAiEnabled({ NEXT_PUBLIC_ENABLE_AI: "1" })).toBe(false);
  });

  it("is on only when set to true", () => {
    expect(isAiEnabled({ NEXT_PUBLIC_ENABLE_AI: "true" })).toBe(true);
  });
});

describe("buildRewrites", () => {
  it("omits the /api/intelligence rewrite when AI is disabled", () => {
    const sources = buildRewrites({}).map((r) => r.source);
    expect(sources).toEqual(["/api/v1/:path*"]);
  });

  it("includes the /api/intelligence rewrite when AI is enabled", () => {
    const rewrites = buildRewrites({
      NEXT_PUBLIC_ENABLE_AI: "true",
      INTELLIGENCE_SERVICE_URL: "http://ai.internal:9000",
    });
    expect(rewrites).toContainEqual({
      source: "/api/intelligence/:path*",
      destination: "http://ai.internal:9000/:path*",
    });
  });

  it("keeps the API rewrite in both modes", () => {
    const env = { NEXT_PUBLIC_API_URL: "https://api.example.com/api/v1" };
    expect(buildRewrites(env)[0]).toEqual({
      source: "/api/v1/:path*",
      destination: "https://api.example.com/api/v1/:path*",
    });
  });
});
