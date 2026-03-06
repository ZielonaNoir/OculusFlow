import { z } from "zod";

export const VIDEO_PROJECT_ENTITY_TYPES = [
  "character",
  "asset",
  "background",
  "dialogue",
  "action",
  "emotion",
  "scene",
] as const;

export type VideoProjectEntityType = (typeof VIDEO_PROJECT_ENTITY_TYPES)[number];

export const VIDEO_WORKFLOW_STEPS = [
  "script",
  "character_turnaround",
  "asset_turnaround",
  "background_plate",
  "dialogue_motion_board",
  "storyboard_grid",
  "storyboard_hd",
  "final_video",
] as const;

export type VideoWorkflowStep = (typeof VIDEO_WORKFLOW_STEPS)[number];

export const ENTITY_TYPE_LABELS: Record<VideoProjectEntityType, string> = {
  character: "人物",
  asset: "资产",
  background: "背景",
  dialogue: "对话",
  action: "动作",
  emotion: "情绪",
  scene: "场景",
};

export const DEFAULT_PROJECT_FORM = {
  title: "",
  prompt: "",
  genre: "商业短片",
  tone: "电影感写实",
  duration_seconds: 5,
  aspect_ratio: "16:9",
  shot_count: 9,
};

export const videoProjectInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(6000),
  genre: z.string().trim().max(120).default("商业短片"),
  tone: z.string().trim().max(120).default("电影感写实"),
  duration_seconds: z.number().int().min(4).max(12).default(5),
  aspect_ratio: z.string().trim().max(20).default("16:9"),
  shot_count: z.number().int().min(4).max(12).default(9),
  image_model: z.string().trim().optional(),
  video_model: z.string().trim().optional(),
  reference_images: z.array(z.string()).default([]),
  extra_context: z.record(z.string(), z.unknown()).default({}),
});

export const entityPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(VIDEO_PROJECT_ENTITY_TYPES),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).default(""),
  enabled: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
  json_payload: z.record(z.string(), z.unknown()).default({}),
});

export const regeneratePromptSchema = z.object({
  step: z.enum(VIDEO_WORKFLOW_STEPS),
  entity_ids: z.array(z.string().uuid()).default([]),
  shot_count: z.number().int().min(4).max(12).optional(),
  selected_row: z.number().int().min(1).max(12).optional(),
  selected_col: z.number().int().min(1).max(12).optional(),
  selected_index: z.number().int().min(1).max(12).optional(),
  prompt_override: z.string().trim().max(6000).optional(),
  image_options: z
    .object({
      size: z.string().optional(),
      seed: z.number().optional(),
      guidanceScale: z.number().optional(),
      watermark: z.boolean().optional(),
      responseFormat: z.enum(["url", "b64_json"]).optional(),
      sequentialImageGeneration: z.enum(["auto", "disabled"]).optional(),
      maxImages: z.number().optional(),
      optimizePromptMode: z.enum(["standard", "fast"]).optional(),
    })
    .optional(),
});

export const storyboardSelectionSchema = z.object({
  shot_count: z.number().int().min(4).max(12),
  prompt: z.string().trim().min(1).max(8000),
  grid_image_url: z.string().trim().optional(),
  selected_row: z.number().int().min(1).max(12).nullable().optional(),
  selected_col: z.number().int().min(1).max(12).nullable().optional(),
  selected_index: z.number().int().min(1).max(12).nullable().optional(),
  hd_prompt: z.string().trim().max(8000).optional(),
  hd_image_url: z.string().trim().optional(),
  metadata_snapshot: z.record(z.string(), z.unknown()).default({}),
});

export function getEntityTypeLabel(type: VideoProjectEntityType) {
  return ENTITY_TYPE_LABELS[type];
}

export function inferStoryboardGrid(shotCount: number) {
  const cols = shotCount >= 9 ? 3 : shotCount >= 6 ? 3 : 2;
  const rows = Math.ceil(shotCount / cols);
  return { rows, cols };
}

export type VideoProjectInput = z.infer<typeof videoProjectInputSchema>;
export type VideoEntityInput = z.infer<typeof entityPayloadSchema>;
export type RegeneratePromptInput = z.infer<typeof regeneratePromptSchema>;
export type StoryboardSelectionInput = z.infer<typeof storyboardSelectionSchema>;
