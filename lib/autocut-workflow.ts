import { z } from "zod";

export const AUTOCUT_SEGMENT_TYPES = ["voiceover", "movie_quote", "b_roll"] as const;
export type AutoCutSegmentType = (typeof AUTOCUT_SEGMENT_TYPES)[number];

export const AUTOCUT_JOB_TYPES = [
  "analyze",
  "quote_map",
  "render",
  "fetch_clips",
  "generate_voice",
  "align_subtitles",
] as const;
export type AutoCutJobType = (typeof AUTOCUT_JOB_TYPES)[number];

export const AUTOCUT_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "partial",
  "cancelled",
] as const;
export type AutoCutJobStatus = (typeof AUTOCUT_JOB_STATUSES)[number];

export const AUTOCUT_STAGES = [
  "draft",
  "analyzed",
  "quote_mapped",
  "render_queued",
  "rendering",
  "rendered",
  "failed",
] as const;
export type AutoCutStage = (typeof AUTOCUT_STAGES)[number];

export const CLIP_PROVIDER_KEYS = ["apify", "yarn", "playphrase", "pexels"] as const;
export type ClipProviderKey = (typeof CLIP_PROVIDER_KEYS)[number];

export const AUTOCUT_RETRIEVAL_INTENTS = [
  "quote_scene",
  "reaction_closeup",
  "action_chase",
  "city_establishing",
  "emotional_broll",
  "generic_broll",
] as const;
export type AutoCutRetrievalIntent = (typeof AUTOCUT_RETRIEVAL_INTENTS)[number];

export const AUTOCUT_RETRIEVAL_MOODS = [
  "tense",
  "determined",
  "lonely",
  "inspirational",
  "warm",
  "neutral",
] as const;
export type AutoCutRetrievalMood = (typeof AUTOCUT_RETRIEVAL_MOODS)[number];

export const AUTOCUT_VOICE_STYLES = [
  "cinematic_narration",
  "calm_inspiring",
  "intense_trailer",
] as const;
export type AutoCutVoiceStyle = (typeof AUTOCUT_VOICE_STYLES)[number];

export const AUTOCUT_VOICE_EMOTIONS = [
  "neutral",
  "determined",
  "tense",
  "warm",
  "urgent",
] as const;
export type AutoCutVoiceEmotion = (typeof AUTOCUT_VOICE_EMOTIONS)[number];

export const AUTOCUT_VOICE_PACES = ["slow", "medium", "fast"] as const;
export type AutoCutVoicePace = (typeof AUTOCUT_VOICE_PACES)[number];

export const AUTOCUT_VOICE_INTENSITIES = ["low", "medium", "high"] as const;
export type AutoCutVoiceIntensity = (typeof AUTOCUT_VOICE_INTENSITIES)[number];

export const DEFAULT_AUTOCUT_PROJECT_FORM = {
  title: "",
  source_text: "",
  aspect_ratio: "21:9",
  duration_seconds: 60,
  fish_voice_id: "anna",
  voice_character: "anna",
  voice_style: "cinematic_narration",
  subtitle_style: "word_highlight",
  locale_mapping_enabled: true,
  clip_provider_priority: ["apify", "yarn", "playphrase", "pexels"] as ClipProviderKey[],
  voice_provider: "fishaudio",
  voice_model: "speech-1",
};

const retrievalIntentSchema = z.enum(AUTOCUT_RETRIEVAL_INTENTS);
const retrievalMoodSchema = z.enum(AUTOCUT_RETRIEVAL_MOODS);
const voiceStyleSchema = z.enum(AUTOCUT_VOICE_STYLES);
const voiceEmotionSchema = z.enum(AUTOCUT_VOICE_EMOTIONS);
const voicePaceSchema = z.enum(AUTOCUT_VOICE_PACES);
const voiceIntensitySchema = z.enum(AUTOCUT_VOICE_INTENSITIES);

export const autocutProjectInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  source_text: z.string().trim().min(1).max(12000),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "21:9"]).default("21:9"),
  duration_seconds: z.number().int().min(5).max(180).default(60),
  fish_voice_id: z.string().trim().min(1).max(120).default("anna"),
  voice_character: z.string().trim().min(1).max(120).default("anna"),
  voice_style: voiceStyleSchema.default("cinematic_narration"),
  subtitle_style: z.enum(["word_highlight", "bounce"]).default("word_highlight"),
  locale_mapping_enabled: z.boolean().default(true),
  clip_provider_priority: z.array(z.enum(CLIP_PROVIDER_KEYS)).min(1).max(4).default(["apify", "yarn", "playphrase", "pexels"]),
  voice_provider: z.string().trim().min(1).max(80).default("fishaudio"),
  voice_model: z.string().trim().min(1).max(120).default("speech-1"),
  settings_snapshot: z.record(z.string(), z.unknown()).default({}),
});

export const autocutSegmentInputSchema = z.object({
  type: z.enum(AUTOCUT_SEGMENT_TYPES),
  order_index: z.number().int().min(0).max(9999),
  text: z.string().trim().min(1).max(4000),
  language: z.string().trim().min(2).max(20).default("zh-CN"),
  source_title: z.string().trim().max(240).nullable().optional(),
  source_query: z.string().trim().max(1000).nullable().optional(),
  b_roll_query: z.string().trim().max(1000).nullable().optional(),
  duration_ms: z.number().int().min(0).max(600000).default(0),
  enabled: z.boolean().default(true),
  retrieval_intent: retrievalIntentSchema.nullable().optional(),
  retrieval_subject: z.string().trim().max(240).nullable().optional(),
  retrieval_mood: retrievalMoodSchema.nullable().optional(),
  retrieval_queries: z.array(z.string().trim().min(1).max(1000)).max(4).default([]),
  retrieval_negative_terms: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  retrieval_visual_constraints: z.record(z.string(), z.unknown()).default({}),
  voice_emotion: voiceEmotionSchema.nullable().optional(),
  voice_pace: voicePaceSchema.nullable().optional(),
  voice_intensity: voiceIntensitySchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const quoteMapInputSchema = z.object({
  segment_id: z.string().uuid().optional(),
  text_override: z.string().trim().max(4000).optional(),
});

export const renderInputSchema = z.object({
  project_id: z.string().uuid(),
  force_regenerate: z.boolean().default(false),
});

export type AutoCutProjectInput = z.infer<typeof autocutProjectInputSchema>;
export type AutoCutSegmentInput = z.infer<typeof autocutSegmentInputSchema>;
export type QuoteMapInput = z.infer<typeof quoteMapInputSchema>;
export type RenderInput = z.infer<typeof renderInputSchema>;

export type AutoCutSegmentRow = AutoCutSegmentInput & {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type AutoCutProjectRow = AutoCutProjectInput & {
  id: string;
  user_id: string;
  current_stage: AutoCutStage;
  final_video_url: string | null;
  final_subtitle_url: string | null;
  engine_job_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AutoCutAssetRow = {
  id: string;
  project_id: string;
  segment_id: string | null;
  user_id: string;
  asset_type: "clip" | "b_roll" | "audio" | "subtitle" | "final_video";
  provider: string | null;
  source_url: string | null;
  storage_path: string | null;
  signed_url: string | null;
  duration_ms: number | null;
  trim_start_ms: number | null;
  trim_end_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AutoCutSegmentAssetKind = "clip" | "b_roll" | "audio" | "subtitle";

export type AutoCutSegmentResult = {
  segment_id: string;
  segment_type: AutoCutSegmentType;
  provider: string;
  asset_kind: AutoCutSegmentAssetKind;
  status: "succeeded" | "failed" | "partial";
  source_query: string | null;
  fallback_reason: string | null;
  warning: string | null;
  local_path: string | null;
  public_url: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
};

export type AutoCutJobRow = {
  id: string;
  project_id: string;
  user_id: string;
  job_type: AutoCutJobType;
  status: AutoCutJobStatus;
  provider: string | null;
  provider_job_id: string | null;
  error_message: string | null;
  result_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function normalizeClipProviderPriority(input: string[] | null | undefined): ClipProviderKey[] {
  const normalized = (input ?? [])
    .map((item) => item.toLowerCase())
    .filter((item): item is ClipProviderKey => CLIP_PROVIDER_KEYS.includes(item as ClipProviderKey));
  return normalized.length > 0 ? normalized : [...DEFAULT_AUTOCUT_PROJECT_FORM.clip_provider_priority];
}

export function reorderSegments<T extends { order_index: number }>(segments: T[]) {
  return [...segments]
    .sort((a, b) => a.order_index - b.order_index)
    .map((segment, index) => ({ ...segment, order_index: index }));
}

export function nextSegmentOrder(segments: Array<{ order_index: number }>) {
  return segments.reduce((max, segment) => Math.max(max, segment.order_index), -1) + 1;
}

export function getSegmentLabel(type: AutoCutSegmentType) {
  switch (type) {
    case "voiceover":
      return "旁白";
    case "movie_quote":
      return "影视台词";
    case "b_roll":
      return "空镜";
    default:
      return type;
  }
}

export function getVoiceStyleLabel(style: AutoCutVoiceStyle) {
  switch (style) {
    case "cinematic_narration":
      return "电影旁白";
    case "calm_inspiring":
      return "温和激励";
    case "intense_trailer":
      return "预告片张力";
    default:
      return style;
  }
}

export function getVoiceEmotionLabel(emotion: AutoCutVoiceEmotion) {
  switch (emotion) {
    case "neutral":
      return "平稳";
    case "determined":
      return "坚定";
    case "tense":
      return "紧张";
    case "warm":
      return "温暖";
    case "urgent":
      return "急促";
    default:
      return emotion;
  }
}

export function getVoicePaceLabel(pace: AutoCutVoicePace) {
  switch (pace) {
    case "slow":
      return "慢";
    case "medium":
      return "中";
    case "fast":
      return "快";
    default:
      return pace;
  }
}

export function getVoiceIntensityLabel(intensity: AutoCutVoiceIntensity) {
  switch (intensity) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    default:
      return intensity;
  }
}

export function normalizeVoiceStyle(input: string | null | undefined): AutoCutVoiceStyle {
  return AUTOCUT_VOICE_STYLES.includes((input || "") as AutoCutVoiceStyle)
    ? (input as AutoCutVoiceStyle)
    : ("cinematic_narration" as AutoCutVoiceStyle);
}

export function normalizeSubtitleStyle(input: string | null | undefined) {
  return input === "bounce" ? "bounce" : "word_highlight";
}

export function normalizeAspectRatio(input: string | null | undefined): AutoCutProjectInput["aspect_ratio"] {
  return ["16:9", "9:16", "1:1", "4:3", "21:9"].includes(input || "")
    ? (input as AutoCutProjectInput["aspect_ratio"])
    : ("21:9" as AutoCutProjectInput["aspect_ratio"]);
}

export function resolveNextProvider(
  priority: ClipProviderKey[],
  failures: string[] | null | undefined
): ClipProviderKey | null {
  const failed = new Set((failures ?? []).map((item) => item.toLowerCase()));
  for (const provider of normalizeClipProviderPriority(priority)) {
    if (!failed.has(provider)) return provider;
  }
  return null;
}

export function getAssetTypeForSegment(type: AutoCutSegmentType): AutoCutAssetRow["asset_type"] {
  return type === "movie_quote" ? "clip" : "b_roll";
}

export function parseJsonText<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

export function buildDefaultVoiceDirection(
  type: AutoCutSegmentType,
  text: string,
  voiceStyle: AutoCutVoiceStyle
) {
  const lower = text.toLowerCase();
  const tensePattern = /杀|追|逃|绝望|危机|fight|kill|chase|danger/;
  const warmPattern = /勇敢|成功|机会|生命|坚持|希望|believe|success|inspire/;

  if (tensePattern.test(lower)) {
    return {
      voice_emotion: "tense" as const,
      voice_pace: type === "voiceover" ? "medium" as const : "fast" as const,
      voice_intensity: type === "movie_quote" ? "high" as const : "medium" as const,
    };
  }

  if (warmPattern.test(lower)) {
    return {
      voice_emotion: voiceStyle === "intense_trailer" ? "determined" as const : "warm" as const,
      voice_pace: "medium" as const,
      voice_intensity: "medium" as const,
    };
  }

  return {
    voice_emotion: type === "movie_quote" ? "determined" as const : "neutral" as const,
    voice_pace: "medium" as const,
    voice_intensity: type === "movie_quote" ? "medium" as const : "low" as const,
  };
}

export function buildDefaultRetrievalPlan(
  type: AutoCutSegmentType,
  text: string,
  aspectRatio: string
) {
  const cleaned = text.replace(/[“”"'`]/g, "").trim();
  const shortText = cleaned.slice(0, 40);

  if (type === "movie_quote") {
    return {
      retrieval_intent: "quote_scene" as const,
      retrieval_subject: shortText || "movie dialogue scene",
      retrieval_mood: /绝望|杀|追|hunt|kill|revenge/.test(cleaned) ? ("tense" as const) : ("determined" as const),
      retrieval_queries: [
        `${shortText} movie scene`,
        `${shortText} cinematic dialogue close up`,
        `${shortText} intense reaction shot ${aspectRatio}`,
      ].filter(Boolean),
      retrieval_negative_terms: ["animation", "logo", "vertical"],
      retrieval_visual_constraints: {
        aspect_ratio: aspectRatio,
        shot_size: "close_up",
        motion: "dialogue_or_reaction",
      },
    };
  }

  if (/夜景|城市|街头|city|night/.test(cleaned)) {
    return {
      retrieval_intent: "city_establishing" as const,
      retrieval_subject: "city night chase",
      retrieval_mood: "tense" as const,
      retrieval_queries: [
        `cinematic city night running chase ${aspectRatio}`,
        `urban night pursuit dramatic ${aspectRatio}`,
        `city street suspense b roll ${aspectRatio}`,
      ],
      retrieval_negative_terms: ["animation", "interview", "logo", "vertical"],
      retrieval_visual_constraints: {
        aspect_ratio: aspectRatio,
        time_of_day: "night",
        motion: "running",
      },
    };
  }

  if (/追|奔跑|chase|run/.test(cleaned)) {
    return {
      retrieval_intent: "action_chase" as const,
      retrieval_subject: "running pursuit",
      retrieval_mood: "tense" as const,
      retrieval_queries: [
        `cinematic running pursuit ${aspectRatio}`,
        `dramatic chase sequence ${aspectRatio}`,
        `handheld action run b roll ${aspectRatio}`,
      ],
      retrieval_negative_terms: ["animation", "logo", "vertical"],
      retrieval_visual_constraints: {
        aspect_ratio: aspectRatio,
        motion: "fast",
      },
    };
  }

  if (/绝望|悲伤|哭|表情|emotion|despair/.test(cleaned)) {
    return {
      retrieval_intent: "reaction_closeup" as const,
      retrieval_subject: "emotional reaction close up",
      retrieval_mood: "lonely" as const,
      retrieval_queries: [
        `emotional reaction close up cinematic ${aspectRatio}`,
        `desperate face close up dramatic ${aspectRatio}`,
        `sad character expression b roll ${aspectRatio}`,
      ],
      retrieval_negative_terms: ["animation", "logo", "vertical"],
      retrieval_visual_constraints: {
        aspect_ratio: aspectRatio,
        shot_size: "close_up",
      },
    };
  }

  const inspirational = /机会|成功|生命|勇敢|坚持|平衡|前进|梦想|机会|believe|success|life/.test(cleaned);
  return {
    retrieval_intent: inspirational ? ("emotional_broll" as const) : ("generic_broll" as const),
    retrieval_subject: inspirational ? "hopeful people action" : shortText || "cinematic b roll",
    retrieval_mood: inspirational ? ("inspirational" as const) : ("neutral" as const),
    retrieval_queries: inspirational
      ? [
          `inspirational cinematic people action ${aspectRatio}`,
          `hopeful lifestyle b roll ${aspectRatio}`,
          `motivational dramatic visuals ${aspectRatio}`,
        ]
      : [
          `cinematic ${shortText || "visual storytelling"} ${aspectRatio}`,
          `dramatic b roll ${aspectRatio}`,
          `storytelling visuals ${aspectRatio}`,
        ],
    retrieval_negative_terms: ["animation", "logo", "vertical"],
    retrieval_visual_constraints: {
      aspect_ratio: aspectRatio,
    },
  };
}

export function withAutoCutProjectDefaults(
  input: Partial<AutoCutProjectInput> & Pick<AutoCutProjectInput, "title" | "source_text">
): AutoCutProjectInput {
  return {
    title: input.title,
    source_text: input.source_text,
    aspect_ratio: normalizeAspectRatio(input.aspect_ratio),
    duration_seconds: input.duration_seconds ?? DEFAULT_AUTOCUT_PROJECT_FORM.duration_seconds,
    fish_voice_id: input.fish_voice_id || DEFAULT_AUTOCUT_PROJECT_FORM.fish_voice_id,
    voice_character: input.voice_character || input.fish_voice_id || DEFAULT_AUTOCUT_PROJECT_FORM.voice_character,
    voice_style: normalizeVoiceStyle(input.voice_style),
    subtitle_style: normalizeSubtitleStyle(input.subtitle_style),
    locale_mapping_enabled: input.locale_mapping_enabled !== false,
    clip_provider_priority: normalizeClipProviderPriority(input.clip_provider_priority),
    voice_provider: input.voice_provider || DEFAULT_AUTOCUT_PROJECT_FORM.voice_provider,
    voice_model: input.voice_model || DEFAULT_AUTOCUT_PROJECT_FORM.voice_model,
    settings_snapshot: input.settings_snapshot || {},
  };
}

export function withAutoCutSegmentDefaults(
  segment: Partial<AutoCutSegmentInput> & Pick<AutoCutSegmentInput, "type" | "text" | "order_index">,
  options?: {
    aspectRatio?: string;
    voiceStyle?: AutoCutVoiceStyle;
  }
): AutoCutSegmentInput {
  const aspectRatio = options?.aspectRatio || DEFAULT_AUTOCUT_PROJECT_FORM.aspect_ratio;
  const voiceStyle = normalizeVoiceStyle(options?.voiceStyle);
  const retrieval = buildDefaultRetrievalPlan(segment.type, segment.text, aspectRatio);
  const voice = buildDefaultVoiceDirection(segment.type, segment.text, voiceStyle);

  const baseSegment: AutoCutSegmentInput = {
    language: "zh-CN",
    source_title: null,
    source_query: null,
    b_roll_query: retrieval.retrieval_queries[0] || `cinematic ${segment.text.slice(0, 24)}`.trim(),
    duration_ms: segment.type === "movie_quote" ? 4000 : 3500,
    enabled: true,
    retrieval_intent: retrieval.retrieval_intent,
    retrieval_subject: retrieval.retrieval_subject,
    retrieval_mood: retrieval.retrieval_mood,
    retrieval_queries: dedupeStrings(retrieval.retrieval_queries).slice(0, 4),
    retrieval_negative_terms: dedupeStrings(retrieval.retrieval_negative_terms).slice(0, 12),
    retrieval_visual_constraints: { ...retrieval.retrieval_visual_constraints },
    voice_emotion: voice.voice_emotion,
    voice_pace: voice.voice_pace,
    voice_intensity: voice.voice_intensity,
    metadata: { generated_by_llm: false },
    ...segment,
  };

  return {
    ...baseSegment,
    retrieval_intent: baseSegment.retrieval_intent ?? retrieval.retrieval_intent,
    retrieval_subject: baseSegment.retrieval_subject ?? retrieval.retrieval_subject,
    retrieval_mood: baseSegment.retrieval_mood ?? retrieval.retrieval_mood,
    retrieval_queries: dedupeStrings(
      baseSegment.retrieval_queries && baseSegment.retrieval_queries.length > 0
        ? baseSegment.retrieval_queries
        : retrieval.retrieval_queries
    ).slice(0, 4),
    retrieval_negative_terms: dedupeStrings(
      baseSegment.retrieval_negative_terms && baseSegment.retrieval_negative_terms.length > 0
        ? baseSegment.retrieval_negative_terms
        : retrieval.retrieval_negative_terms
    ).slice(0, 12),
    retrieval_visual_constraints: {
      ...retrieval.retrieval_visual_constraints,
      ...(baseSegment.retrieval_visual_constraints || {}),
    },
    voice_emotion: baseSegment.voice_emotion ?? voice.voice_emotion,
    voice_pace: baseSegment.voice_pace ?? voice.voice_pace,
    voice_intensity: baseSegment.voice_intensity ?? voice.voice_intensity,
    metadata: {
      generated_by_llm: false,
      ...(baseSegment.metadata || {}),
    },
  };
}

export function buildMockTimeline(
  sourceText: string,
  options?: {
    aspectRatio?: string;
    voiceStyle?: AutoCutVoiceStyle;
  }
): AutoCutSegmentInput[] {
  const lines = sourceText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const seed = lines.length > 0 ? lines : [sourceText.slice(0, 120)];

  return seed.slice(0, 6).map((line, index) => {
    if (index % 3 === 1) {
      return withAutoCutSegmentDefaults(
        {
          type: "movie_quote",
          order_index: index,
          text: line,
          metadata: { generated_by_llm: false },
        },
        options
      );
    }

    return withAutoCutSegmentDefaults(
      {
        type: "voiceover",
        order_index: index,
        text: line,
        metadata: { generated_by_llm: index !== 0 },
      },
      options
    );
  });
}

function dedupeStrings(input: string[]) {
  return [...new Set(input.map((item) => item.trim()).filter(Boolean))];
}
