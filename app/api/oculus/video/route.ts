import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_VIDEO_MODEL = "doubao-seedance-1-5-pro";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

type TaskResponse = Record<string, unknown>;

export function extractTaskId(payload: TaskResponse): string | null {
  const direct = payload.id;
  if (typeof direct === "string") return direct;
  const data = payload.data;
  if (data && typeof data === "object" && "id" in data && typeof data.id === "string") {
    return data.id;
  }
  if ("task_id" in payload && typeof payload.task_id === "string") {
    return payload.task_id;
  }
  return null;
}

export function extractStatus(payload: TaskResponse): string | null {
  const candidates = [
    payload.status,
    payload.task_status,
    payload.state,
    typeof payload.data === "object" && payload.data ? (payload.data as TaskResponse).status : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") return candidate.toLowerCase();
  }
  return null;
}

export function extractVideoUrl(payload: TaskResponse): string | null {
  const queue: unknown[] = [payload];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    const record = current as Record<string, unknown>;
    if (typeof record.video_url === "string") return record.video_url;
    if (typeof record.url === "string" && /\.(mp4|mov|webm)(\?|$)/i.test(record.url)) return record.url;
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) queue.push(...value);
      else if (value && typeof value === "object") queue.push(value);
    }
  }
  return null;
}

export function extractProgress(payload: TaskResponse): number | null {
  const candidates = [
    payload.progress,
    payload.percent,
    typeof payload.data === "object" && payload.data ? (payload.data as TaskResponse).progress : null,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string" && !Number.isNaN(Number(candidate))) return Number(candidate);
  }
  return null;
}

export function isFinished(status: string | null) {
  return status === "succeeded" || status === "success" || status === "completed";
}

export function isFailed(status: string | null) {
  return status === "failed" || status === "error" || status === "cancelled" || status === "expired";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAuthedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function updatePersistedTask(taskId: string | null | undefined, patch: Record<string, unknown>) {
  if (!taskId) return;
  const supabase = await createClient();
  await supabase
    .from("video_generation_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId);
}

async function fetchTask(providerTaskId: string) {
  const taskResponse = await fetch(`${ARK_BASE_URL}/contents/generations/tasks/${providerTaskId}`, {
    headers: {
      Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const taskPayload = (await taskResponse.json()) as TaskResponse;
  const status = extractStatus(taskPayload) ?? (taskResponse.ok ? "running" : "failed");
  const videoUrl = extractVideoUrl(taskPayload);
  const progress = extractProgress(taskPayload);
  return { ok: taskResponse.ok, payload: taskPayload, status, videoUrl, progress };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const persistedTaskId = searchParams.get("taskId");
    const providerTaskId = searchParams.get("providerTaskId");

    if (!VOLCENGINE_API_KEY) {
      return NextResponse.json({ error: "VOLCENGINE_API_KEY 未配置，无法查询视频任务" }, { status: 500 });
    }

    let resolvedProviderTaskId = providerTaskId;
    if (!resolvedProviderTaskId && persistedTaskId) {
      const { supabase, user } = await getAuthedSupabase();
      if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
      const { data } = await supabase
        .from("video_generation_tasks")
        .select("provider_task_id")
        .eq("id", persistedTaskId)
        .eq("user_id", user.id)
        .single();
      resolvedProviderTaskId = data?.provider_task_id ?? null;
    }

    if (!resolvedProviderTaskId) {
      return NextResponse.json({ error: "缺少 taskId 或 providerTaskId" }, { status: 400 });
    }

    const task = await fetchTask(resolvedProviderTaskId);
    if (persistedTaskId) {
      await updatePersistedTask(persistedTaskId, {
        provider_task_id: resolvedProviderTaskId,
        status: task.status,
        result_url: task.videoUrl,
        result_payload: task.payload,
        error_message: task.ok || !isFailed(task.status) ? null : JSON.stringify(task.payload),
      });
    }

    return NextResponse.json({
      taskId: persistedTaskId,
      providerTaskId: resolvedProviderTaskId,
      status: task.status,
      progress: task.progress,
      error: task.ok || !isFailed(task.status) ? null : "视频任务失败",
      result: task.videoUrl ? { video_url: task.videoUrl } : null,
      raw: task.payload,
    });
  } catch (error) {
    console.error("[VideoGen] query error:", error);
    return NextResponse.json({ error: "查询视频任务失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      modelId,
      moduleType,
      projectId,
      paramsSnapshot,
      waitForResult = false,
      content,
      ratio = "16:9",
      duration = 5,
      resolution = "720p",
      seed = -1,
      camera_fixed = false,
      watermark = false,
      generate_audio = true,
      draft = false,
      service_tier = "default",
      return_last_frame = false,
    } = body as {
      prompt?: string;
      modelId?: string;
      moduleType?: string;
      projectId?: string;
      paramsSnapshot?: Record<string, unknown>;
      waitForResult?: boolean;
      content?: Array<Record<string, unknown>>;
      ratio?: string;
      duration?: number;
      resolution?: string;
      seed?: number;
      camera_fixed?: boolean;
      watermark?: boolean;
      generate_audio?: boolean;
      draft?: boolean;
      service_tier?: string;
      return_last_frame?: boolean;
    };

    if (!prompt?.trim() && (!content || content.length === 0)) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!VOLCENGINE_API_KEY) {
      return NextResponse.json({ error: "VOLCENGINE_API_KEY 未配置，无法生成视频" }, { status: 500 });
    }

    const payloadContent =
      Array.isArray(content) && content.length > 0
        ? content
        : [{ type: "text", text: prompt }];

    const createResponse = await fetch(`${ARK_BASE_URL}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId || DEFAULT_VIDEO_MODEL,
        content: payloadContent,
        ratio,
        duration,
        resolution,
        seed,
        camera_fixed,
        watermark,
        generate_audio,
        draft,
        service_tier,
        return_last_frame,
      }),
    });

    const createPayload = (await createResponse.json()) as TaskResponse;
    if (!createResponse.ok) {
      const errorMessage =
        typeof createPayload.error === "string"
          ? createPayload.error
          : `视频任务创建失败 (${createResponse.status})`;
      return NextResponse.json({ error: errorMessage }, { status: createResponse.status });
    }

    const providerTaskId = extractTaskId(createPayload);
    if (!providerTaskId) {
      return NextResponse.json({ error: "视频任务已创建，但未返回 task id" }, { status: 502 });
    }

    let persistedTaskId: string | null = null;
    const { supabase, user } = await getAuthedSupabase();
    if (projectId && user) {
      const { data: task } = await supabase
        .from("video_generation_tasks")
        .insert({
          project_id: projectId,
          user_id: user.id,
          task_type: "video",
          step_key: moduleType || "final_video",
          provider_task_id: providerTaskId,
          status: "queued",
          model_id: modelId || DEFAULT_VIDEO_MODEL,
          prompt: prompt || "",
          params_snapshot: {
            ratio,
            duration,
            resolution,
            seed,
            camera_fixed,
            watermark,
            generate_audio,
            draft,
            service_tier,
            return_last_frame,
            ...(paramsSnapshot || {}),
          },
          result_payload: createPayload,
        })
        .select("id")
        .single();
      persistedTaskId = task?.id ?? null;
    }

    if (!waitForResult) {
      return NextResponse.json({
        taskId: persistedTaskId,
        providerTaskId,
        status: "queued",
        progress: 0,
        result: null,
      });
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const task = await fetchTask(providerTaskId);
      if (persistedTaskId) {
        await updatePersistedTask(persistedTaskId, {
          status: task.status,
          result_url: task.videoUrl,
          result_payload: task.payload,
          error_message: task.ok || !isFailed(task.status) ? null : JSON.stringify(task.payload),
        });
      }

      if (task.videoUrl) {
        return NextResponse.json({
          taskId: persistedTaskId,
          providerTaskId,
          status: task.status || "succeeded",
          progress: task.progress,
          result: { video_url: task.videoUrl },
          video_url: task.videoUrl,
        });
      }

      if (!task.ok || isFailed(task.status)) {
        return NextResponse.json(
          {
            error: "视频任务失败",
            taskId: persistedTaskId,
            providerTaskId,
            status: task.status,
            raw: task.payload,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "视频生成超时，请稍后通过 taskId 查询",
        taskId: persistedTaskId,
        providerTaskId,
        status: "running",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[VideoGen] Error:", error);
    return NextResponse.json({ error: "Failed to generate video" }, { status: 500 });
  }
}
