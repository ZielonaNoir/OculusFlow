import { describe, expect, test } from "vitest";
import {
  buildMockTimeline,
  normalizeClipProviderPriority,
  resolveNextProvider,
} from "@/lib/autocut-workflow";

describe("autocut workflow helpers", () => {
  test("buildMockTimeline produces structured segments", () => {
    const timeline = buildMockTimeline("第一句文案\n第二句文案\n第三句文案");
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].type).toBe("voiceover");
    expect(timeline.some((segment) => segment.type === "movie_quote")).toBe(true);
  });

  test("normalizeClipProviderPriority falls back to defaults", () => {
    expect(normalizeClipProviderPriority(["invalid"])).toEqual([
      "apify",
      "yarn",
      "playphrase",
      "pexels",
    ]);
  });

  test("resolveNextProvider skips previous failures", () => {
    expect(resolveNextProvider(["apify", "yarn", "pexels"], ["apify", "yarn"])).toBe("pexels");
    expect(resolveNextProvider(["apify"], ["apify"])).toBeNull();
  });
});
