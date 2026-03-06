import { describe, expect, test } from "vitest";
import {
  DEFAULT_PROJECT_FORM,
  entityPayloadSchema,
  getEntityTypeLabel,
  inferStoryboardGrid,
  regeneratePromptSchema,
  storyboardSelectionSchema,
  videoProjectInputSchema,
} from "@/lib/oculus-video-workflow";

describe("oculus video workflow schema", () => {
  test("videoProjectInputSchema applies defaults for optional fields", () => {
    const parsed = videoProjectInputSchema.parse({
      title: "项目 A",
      prompt: "生成一个商业短片",
    });

    expect(parsed.genre).toBe(DEFAULT_PROJECT_FORM.genre);
    expect(parsed.tone).toBe(DEFAULT_PROJECT_FORM.tone);
    expect(parsed.duration_seconds).toBe(DEFAULT_PROJECT_FORM.duration_seconds);
    expect(parsed.aspect_ratio).toBe(DEFAULT_PROJECT_FORM.aspect_ratio);
    expect(parsed.shot_count).toBe(DEFAULT_PROJECT_FORM.shot_count);
    expect(parsed.reference_images).toEqual([]);
    expect(parsed.extra_context).toEqual({});
  });

  test("entityPayloadSchema enforces supported entity type and defaults", () => {
    const parsed = entityPayloadSchema.parse({
      type: "character",
      name: "主角",
    });

    expect(parsed.enabled).toBe(true);
    expect(parsed.sort_order).toBe(0);
    expect(parsed.description).toBe("");
    expect(parsed.json_payload).toEqual({});
  });

  test("regeneratePromptSchema accepts storyboard selection context", () => {
    const parsed = regeneratePromptSchema.parse({
      step: "storyboard_hd",
      selected_row: 2,
      selected_col: 3,
      selected_index: 6,
      image_options: {
        size: "4K",
        responseFormat: "url",
      },
    });

    expect(parsed.step).toBe("storyboard_hd");
    expect(parsed.selected_index).toBe(6);
    expect(parsed.image_options?.size).toBe("4K");
  });

  test("storyboardSelectionSchema preserves selected cell and metadata snapshot", () => {
    const parsed = storyboardSelectionSchema.parse({
      shot_count: 9,
      prompt: "九宫格故事板",
      selected_row: 2,
      selected_col: 1,
      selected_index: 4,
      metadata_snapshot: {
        source: "script",
      },
    });

    expect(parsed.selected_row).toBe(2);
    expect(parsed.selected_col).toBe(1);
    expect(parsed.selected_index).toBe(4);
    expect(parsed.metadata_snapshot).toEqual({ source: "script" });
  });
});

describe("workflow helpers", () => {
  test("inferStoryboardGrid returns stable row/column layout", () => {
    expect(inferStoryboardGrid(4)).toEqual({ rows: 2, cols: 2 });
    expect(inferStoryboardGrid(6)).toEqual({ rows: 2, cols: 3 });
    expect(inferStoryboardGrid(9)).toEqual({ rows: 3, cols: 3 });
    expect(inferStoryboardGrid(12)).toEqual({ rows: 4, cols: 3 });
  });

  test("getEntityTypeLabel maps supported entity labels", () => {
    expect(getEntityTypeLabel("character")).toBe("人物");
    expect(getEntityTypeLabel("dialogue")).toBe("对话");
    expect(getEntityTypeLabel("scene")).toBe("场景");
  });
});
