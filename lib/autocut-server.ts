import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@/utils/supabase/server";
import {
  buildMockTimeline,
  normalizeClipProviderPriority,
  normalizeSubtitleStyle,
  normalizeVoiceStyle,
  parseJsonText,
  autocutSegmentInputSchema,
  withAutoCutProjectDefaults,
  withAutoCutSegmentDefaults,
  type AutoCutProjectInput,
  type AutoCutProjectRow,
  type AutoCutSegmentInput,
  type AutoCutSegmentRow,
} from "@/lib/autocut-workflow";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const TEXT_ENDPOINT_ID = process.env.DOUBAO_ENDPOINT_ID || "";
const STORAGE_BUCKET = "user-generated";
const ASSET_FETCH_TIMEOUT_MS = Number(process.env.AUTOCUT_ASSET_FETCH_TIMEOUT_MS || "20000");

const volcengine = createOpenAI({
  apiKey: VOLCENGINE_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

export async function requireAuthedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return { supabase, user };
}

export async function getAutoCutBundle(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("autocut_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (projectError || !project) throw new Error("PROJECT_NOT_FOUND");

  const [{ data: segments }, { data: assets }, { data: jobs }] = await Promise.all([
    supabase
      .from("autocut_segments")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("autocut_assets")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("autocut_jobs")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    project: project as AutoCutProjectRow,
    segments: (segments ?? []) as AutoCutSegmentRow[],
    assets: assets ?? [],
    jobs: jobs ?? [],
  };
}

export async function analyzeSourceText(input: {
  title: string;
  sourceText: string;
  aspectRatio: string;
  durationSeconds: number;
  localeMappingEnabled: boolean;
  voiceStyle?: AutoCutProjectInput["voice_style"];
}) {
  const fallbackVoiceStyle = input.voiceStyle || "cinematic_narration";
  const fallback = {
    voice_style: fallbackVoiceStyle,
    segments: buildMockTimeline(input.sourceText, {
      aspectRatio: input.aspectRatio,
      voiceStyle: fallbackVoiceStyle,
    }),
  };
  if (!VOLCENGINE_API_KEY || !TEXT_ENDPOINT_ID) {
    return fallback;
  }

  const model = volcengine.chat(TEXT_ENDPOINT_ID);
  const { text } = await generateText({
    model,
    temperature: 0.4,
    system: [
      "你是影视混剪编排助手。",
      "请把用户文案拆解成结构化时间线 JSON。",
      "只允许输出 segments 数组，segments 中 type 只能是 voiceover、movie_quote、b_roll。",
      "你还需要输出项目级 voice_style，只能是 cinematic_narration、calm_inspiring、intense_trailer 之一。",
      "voiceover 必须包含 b_roll_query；movie_quote 必须尽量给出 source_title 和 source_query。",
      "每个片段都必须输出 retrieval_intent、retrieval_subject、retrieval_mood、retrieval_queries、retrieval_negative_terms、retrieval_visual_constraints。",
      "retrieval_intent 只能是 quote_scene、reaction_closeup、action_chase、city_establishing、emotional_broll、generic_broll。",
      "retrieval_mood 只能是 tense、determined、lonely、inspirational、warm、neutral。",
      "每个片段都必须输出 voice_emotion、voice_pace、voice_intensity，用于配音导演控制。",
      "voice_emotion 只能是 neutral、determined、tense、warm、urgent；voice_pace 只能是 slow、medium、fast；voice_intensity 只能是 low、medium、high。",
      "retrieval_queries 必须是 2 到 4 条英文 query，适合素材平台直接搜索。",
      "retrieval_negative_terms 必须是英文排除词数组。",
      "retrieval_visual_constraints 必须描述 aspect_ratio、shot_size、motion、time_of_day 等可见约束。",
      "输出纯 JSON，不要 markdown。",
    ].join(" "),
    prompt: `项目标题：${input.title}
原始文案：${input.sourceText}
目标时长：${input.durationSeconds} 秒
目标画幅：${input.aspectRatio}
语言映射：${input.localeMappingEnabled ? "开启" : "关闭"}

请返回：
{
  "voice_style": "cinematic_narration",
  "segments": [
    {
      "type": "voiceover|movie_quote|b_roll",
      "text": "片段文本",
      "language": "zh-CN",
      "source_title": null,
      "source_query": null,
      "b_roll_query": null,
      "duration_ms": 3000,
      "enabled": true,
      "retrieval_intent": "emotional_broll",
      "retrieval_subject": "主体描述",
      "retrieval_mood": "inspirational",
      "retrieval_queries": ["english query 1", "english query 2"],
      "retrieval_negative_terms": ["animation", "logo"],
      "retrieval_visual_constraints": {
        "aspect_ratio": "${input.aspectRatio}",
        "shot_size": "medium",
        "motion": "steady"
      },
      "voice_emotion": "warm",
      "voice_pace": "medium",
      "voice_intensity": "medium",
      "metadata": {
        "generated_by_llm": false
      }
    }
  ]
}`,
  });

  const parsed = parseJsonText<{ voice_style?: string; segments?: unknown[] }>(text || "", fallback);
  const normalizedVoiceStyle = withAutoCutProjectDefaults({
    title: input.title,
    source_text: input.sourceText,
    voice_style: parsed.voice_style as AutoCutProjectInput["voice_style"] | undefined,
  }).voice_style;
  const normalized = Array.isArray(parsed.segments)
    ? parsed.segments
        .map((segment, index) =>
          autocutSegmentInputSchema.safeParse({
            order_index: index,
            ...((segment && typeof segment === "object") ? (segment as Record<string, unknown>) : {}),
          })
        )
        .filter((item) => item.success)
        .map((item) =>
          withAutoCutSegmentDefaults(item.data, {
            aspectRatio: input.aspectRatio,
            voiceStyle: normalizedVoiceStyle,
          })
        )
    : [];
  return {
    voice_style: normalizedVoiceStyle,
    segments: normalized.length > 0 ? normalized : fallback.segments,
  };
}

export async function mapClassicQuotes(input: {
  sourceText: string;
  segments: AutoCutSegmentRow[];
}) {
  const quoteSegments = input.segments.filter((segment) => segment.type === "movie_quote");
  const fallback = quoteSegments.map((segment) => ({
    id: segment.id,
    canonical_quote_en: segment.text,
    source_title: segment.source_title || "Unknown Source",
    source_query: segment.source_query || segment.text,
    matched_language: "en",
    confidence: 0.35,
  }));

  if (!VOLCENGINE_API_KEY || !TEXT_ENDPOINT_ID || quoteSegments.length === 0) {
    return fallback;
  }

  const model = volcengine.chat(TEXT_ENDPOINT_ID);
  const { text } = await generateText({
    model,
    temperature: 0.3,
    system: [
      "你是电影台词映射助手。",
      "请把中文台词或情绪描述映射为可供海外片段库检索的经典英文台词。",
      "输出 JSON 数组，每项包含 id、canonical_quote_en、source_title、source_query、matched_language、confidence。",
      "如果无法确定影视来源，source_title 允许写 null，但 source_query 必须可检索。",
      "source_query 必须优先输出适合海外影视片段平台检索的英文 query。",
      "输出纯 JSON。",
    ].join(" "),
    prompt: JSON.stringify(
      quoteSegments.map((segment) => ({
        id: segment.id,
        text: segment.text,
        source_title: segment.source_title,
        source_query: segment.source_query,
      }))
    ),
  });

  const parsed = parseJsonText<typeof fallback>(text || "", fallback);
  return parsed.length > 0 ? parsed : fallback;
}

export async function persistRemoteAsset(input: {
  userId: string;
  projectId: string;
  segmentId?: string | null;
  type: "clip" | "b_roll" | "audio" | "subtitle" | "final_video";
  provider?: string | null;
  sourceUrl: string;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), ASSET_FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(input.sourceUrl, { signal: timeoutController.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`下载远程资产超时(${ASSET_FETCH_TIMEOUT_MS}ms): ${input.sourceUrl}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`无法下载远程资产: ${input.sourceUrl}`);
  }

  const buffer = await response.arrayBuffer();
  const ext = inferExtension(response.headers.get("content-type"), input.sourceUrl, input.type);
  const storagePath = `${input.userId}/${input.projectId}/autocut/${input.type}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: response.headers.get("content-type") || inferContentType(ext, input.type),
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 3600);
  const { data, error } = await supabase
    .from("autocut_assets")
    .insert({
      project_id: input.projectId,
      segment_id: input.segmentId ?? null,
      user_id: input.userId,
      asset_type: input.type,
      provider: input.provider ?? null,
      source_url: input.sourceUrl,
      storage_path: storagePath,
      signed_url: signed?.signedUrl ?? null,
      duration_ms: input.durationMs ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function findExistingAutoCutAsset(input: {
  userId: string;
  projectId: string;
  segmentId?: string | null;
  type: "clip" | "b_roll" | "audio" | "subtitle" | "final_video";
  sourceUrl?: string | null;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("autocut_assets")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .eq("asset_type", input.type);

  if (input.segmentId) {
    query = query.eq("segment_id", input.segmentId);
  }
  if (input.sourceUrl) {
    query = query.eq("source_url", input.sourceUrl);
  }

  const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export function buildSettingsSnapshot(input: Record<string, unknown>) {
  const normalizedProject = withAutoCutProjectDefaults({
    title: String(input.title || "未命名混剪项目"),
    source_text: String(input.source_text || input.sourceText || ""),
    fish_voice_id: String(input.fish_voice_id || "anna"),
    voice_character: typeof input.voice_character === "string" ? input.voice_character : undefined,
    voice_style: normalizeVoiceStyle(typeof input.voice_style === "string" ? input.voice_style : undefined),
    subtitle_style: normalizeSubtitleStyle(typeof input.subtitle_style === "string" ? input.subtitle_style : undefined),
    locale_mapping_enabled: input.locale_mapping_enabled !== false,
    clip_provider_priority: normalizeClipProviderPriority(
      Array.isArray(input.clip_provider_priority)
        ? input.clip_provider_priority.map(String)
        : undefined
    ),
    voice_provider: typeof input.voice_provider === "string" ? input.voice_provider : undefined,
    voice_model: typeof input.voice_model === "string" ? input.voice_model : undefined,
  });

  return {
    voice_provider: normalizedProject.voice_provider,
    voice_model: normalizedProject.voice_model,
    fish_voice_id: normalizedProject.fish_voice_id,
    voice_character: normalizedProject.voice_character,
    voice_style: normalizedProject.voice_style,
    subtitle_style: normalizedProject.subtitle_style,
    locale_mapping_enabled: normalizedProject.locale_mapping_enabled,
    clip_provider_priority: normalizeClipProviderPriority(
      Array.isArray(input.clip_provider_priority)
        ? input.clip_provider_priority.map(String)
        : null
    ),
  };
}

function inferExtension(contentType: string | null, sourceUrl: string, type: string) {
  if (contentType?.includes("video/mp4")) return "mp4";
  if (contentType?.includes("audio/mpeg")) return "mp3";
  if (contentType?.includes("application/json")) return "json";
  if (contentType?.includes("text/vtt")) return "vtt";
  const pathname = new URL(sourceUrl).pathname.toLowerCase();
  const ext = pathname.split(".").pop();
  if (ext) return ext;
  if (type === "subtitle") return "vtt";
  if (type === "audio") return "mp3";
  return "mp4";
}

function inferContentType(ext: string, type: string) {
  if (ext === "vtt" || type === "subtitle") return "text/vtt";
  if (ext === "mp3" || type === "audio") return "audio/mpeg";
  return "video/mp4";
}
