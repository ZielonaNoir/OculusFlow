import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@/utils/supabase/server";
import type { VideoProjectEntityType, VideoWorkflowStep } from "@/lib/oculus-video-workflow";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const TEXT_ENDPOINT_ID = process.env.DOUBAO_ENDPOINT_ID || "";

const volcengine = createOpenAI({
  apiKey: VOLCENGINE_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  genre: string;
  tone: string;
  duration_seconds: number;
  aspect_ratio: string;
  shot_count: number;
  image_model: string | null;
  video_model: string | null;
  script_text: string;
  current_stage: string;
  reference_images: string[];
  extra_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type EntityRow = {
  id: string;
  project_id: string;
  user_id: string;
  type: VideoProjectEntityType;
  name: string;
  description: string;
  enabled: boolean;
  sort_order: number;
  json_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type StoryboardRow = {
  id: string;
  project_id: string;
  user_id: string;
  shot_count: number;
  prompt: string;
  grid_image_url: string | null;
  selected_row: number | null;
  selected_col: number | null;
  selected_index: number | null;
  hd_prompt: string;
  hd_image_url: string | null;
  metadata_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  project_id: string;
  user_id: string;
  task_type: "image" | "video" | "prompt";
  step_key: string;
  provider_task_id: string | null;
  status: string;
  model_id: string | null;
  prompt: string;
  params_snapshot: Record<string, unknown>;
  result_url: string | null;
  result_payload: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function requireAuthedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return { supabase, user };
}

export async function getVideoProjectBundle(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("video_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (projectError || !project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const [{ data: entities }, { data: storyboards }, { data: tasks }] = await Promise.all([
    supabase
      .from("video_project_entities")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("video_storyboards")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("video_generation_tasks")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    project: project as ProjectRow,
    entities: (entities ?? []) as EntityRow[],
    storyboards: (storyboards ?? []) as StoryboardRow[],
    tasks: (tasks ?? []) as TaskRow[],
  };
}

export async function generateScriptFromPrompt(input: {
  title: string;
  prompt: string;
  genre: string;
  tone: string;
  durationSeconds: number;
  aspectRatio: string;
}) {
  const fallback = `项目：${input.title}\n题材：${input.genre}\n基调：${input.tone}\n时长：${input.durationSeconds} 秒\n画幅：${input.aspectRatio}\n\n场景设定：围绕用户输入构建一支节奏明确的短片。\n角色：主角、配角、产品/核心资产。\n镜头目标：用连续镜头完成从冲突到解决方案的表达。\n关键动作：角色与产品发生明确互动。\n关键对话："${input.prompt.slice(0, 60)}"\n情绪变化：从好奇/困扰过渡到信任/购买冲动。\n视觉基调：${input.tone}。`;

  if (!VOLCENGINE_API_KEY || !TEXT_ENDPOINT_ID) {
    return fallback;
  }

  const model = volcengine.chat(TEXT_ENDPOINT_ID);
  const { text } = await generateText({
    model,
    temperature: 0.8,
    system: `你是商业短片编剧。请根据用户输入输出一份结构化中文剧本，必须包含：故事设定、角色、场景、镜头目标、关键动作、关键对话、情绪变化、视觉基调。语言要能直接用于后续 AI 分镜和视频生成。`,
    prompt: `项目标题：${input.title}
用户需求：${input.prompt}
题材：${input.genre}
基调：${input.tone}
目标视频时长：${input.durationSeconds} 秒
目标画幅：${input.aspectRatio}

请输出一份适合 AI 视频工作流的中文剧本，分段清晰，信息具体。`,
  });

  return text?.trim() || fallback;
}

export async function extractEntitiesFromScript(scriptText: string) {
  const fallback = buildFallbackEntities(scriptText);
  if (!VOLCENGINE_API_KEY || !TEXT_ENDPOINT_ID) {
    return fallback;
  }

  const model = volcengine.chat(TEXT_ENDPOINT_ID);
  const { text } = await generateText({
    model,
    temperature: 0.2,
    system: `你是影视前期统筹。请从剧本文本中提取结构化元数据，严格输出 JSON，对应字段：
{
  "characters": [{ "name": "", "description": "", "visual_traits": [], "props": [] }],
  "assets": [{ "name": "", "description": "", "materials": [], "usage": "" }],
  "backgrounds": [{ "name": "", "description": "", "lighting": "", "mood": "" }],
  "dialogues": [{ "name": "", "description": "", "line": "" }],
  "actions": [{ "name": "", "description": "", "beat": "" }],
  "emotions": [{ "name": "", "description": "", "intensity": "" }],
  "scenes": [{ "name": "", "description": "", "goal": "" }]
}
不要输出 markdown。`,
    prompt: scriptText,
  });

  try {
    const parsed = JSON.parse(text || "{}") as Record<string, Array<Record<string, unknown>>>;
    return {
      characters: parsed.characters ?? [],
      assets: parsed.assets ?? [],
      backgrounds: parsed.backgrounds ?? [],
      dialogues: parsed.dialogues ?? [],
      actions: parsed.actions ?? [],
      emotions: parsed.emotions ?? [],
      scenes: parsed.scenes ?? [],
    };
  } catch {
    return fallback;
  }
}

export async function regenerateWorkflowPrompt(input: {
  project: ProjectRow;
  entities: EntityRow[];
  step: VideoWorkflowStep;
  promptOverride?: string;
  shotCount?: number;
  selectedRow?: number;
  selectedCol?: number;
  selectedIndex?: number;
  imageOptions?: Record<string, unknown>;
  storyboard?: StoryboardRow | null;
}) {
  const entitySummary = input.entities
    .filter((item) => item.enabled)
    .map((item) => `${item.type}:${item.name} - ${item.description}`)
    .join("\n");

  const stepGuides: Record<VideoWorkflowStep, string> = {
    script: "输出一句适合后续剧本细化的核心创意摘要。",
    character_turnaround: "生成角色四视角图 prompt，必须强调正视图、侧视图、后视图、透视视图，纯净背景，角色形体与服装细节完整。",
    asset_turnaround: "生成资产四视角图 prompt，强调产品/道具外观结构、材质、比例与白底展示。",
    background_plate: "生成环境/背景图 prompt，强调场景布光、空间层次、镜头前景中景远景关系。",
    dialogue_motion_board: "生成对话、动作、情绪辅助分镜的 prompt，强调表演状态、动作节拍、情绪线索。",
    storyboard_grid: "生成故事板总图 prompt，要求产出可用于九宫格或 N 宫格分镜的单张大图，逐格体现镜头节奏。",
    storyboard_hd: "基于已选中的某个宫格分镜，输出单帧 4K 高清分镜图 prompt，保留构图焦点与关键动作。",
    final_video: "生成视频模型使用的最终 prompt，必须整合剧本、角色、资产、背景、动作、对话、情绪、已选分镜、高分图和用户补充意图。",
  };

  const fallback = [
    `项目：${input.project.title}`,
    `步骤：${input.step}`,
    `题材：${input.project.genre}`,
    `基调：${input.project.tone}`,
    `用户需求：${input.promptOverride || input.project.prompt}`,
    `剧本：${input.project.script_text}`,
    entitySummary ? `元数据：\n${entitySummary}` : "",
    input.storyboard?.grid_image_url ? `分镜总图：${input.storyboard.grid_image_url}` : "",
    input.storyboard?.hd_image_url ? `高清分镜：${input.storyboard.hd_image_url}` : "",
    input.selectedIndex ? `选中宫格：第 ${input.selectedIndex} 格（行 ${input.selectedRow} / 列 ${input.selectedCol}）` : "",
    input.imageOptions ? `图片参数：${JSON.stringify(input.imageOptions)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!VOLCENGINE_API_KEY || !TEXT_ENDPOINT_ID) {
    return `${fallback}\n\n请生成一条适配 ${input.step} 的高质量提示词。`;
  }

  const model = volcengine.chat(TEXT_ENDPOINT_ID);
  const { text } = await generateText({
    model,
    temperature: 0.6,
    system: `你是 AI 视频工作流中的 Prompt 编排器。${stepGuides[input.step]}
输出一段可以直接提交给图像或视频模型的中文提示词，不要解释，不要加标题。`,
    prompt: fallback,
  });

  return text?.trim() || `${fallback}\n\n请生成一条适配 ${input.step} 的高质量提示词。`;
}

function buildFallbackEntities(scriptText: string) {
  const seed = scriptText.split(/[\n，。]/).map((part) => part.trim()).filter(Boolean);
  const core = seed[0] || "主角围绕核心产品展开一支商业短片";
  return {
    characters: [
      {
        name: "主角",
        description: `${core}中的主角，外形需要与产品调性一致`,
        visual_traits: ["镜头表现力强", "符合品牌审美"],
        props: ["核心产品"],
      },
    ],
    assets: [
      {
        name: "核心资产",
        description: "与剧本叙事绑定的产品或关键道具",
        materials: ["高质感材质"],
        usage: "推动叙事与视觉记忆点",
      },
    ],
    backgrounds: [
      {
        name: "主场景",
        description: "服务于商业叙事的主环境",
        lighting: "电影感主辅光",
        mood: "高级、可信赖",
      },
    ],
    dialogues: [
      {
        name: "关键台词",
        description: "推动剧情或强调卖点的一句台词",
        line: "这是解决问题的关键时刻。",
      },
    ],
    actions: [
      {
        name: "关键动作",
        description: "角色与资产发生强互动",
        beat: "拿起产品并完成展示动作",
      },
    ],
    emotions: [
      {
        name: "情绪主线",
        description: "从问题到解决后的情绪转换",
        intensity: "由克制到释放",
      },
    ],
    scenes: [
      {
        name: "叙事场景",
        description: core,
        goal: "在有限时长内完成情绪和卖点传达",
      },
    ],
  };
}
