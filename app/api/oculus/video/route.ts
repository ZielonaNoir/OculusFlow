import { NextResponse } from "next/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_VIDEO_MODEL = "doubao-seedance-1-5-pro";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

type TaskResponse = Record<string, unknown>;

function extractTaskId(payload: TaskResponse): string | null {
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

function extractStatus(payload: TaskResponse): string | null {
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

function extractVideoUrl(payload: TaskResponse): string | null {
  const queue: unknown[] = [payload];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;

    const record = current as Record<string, unknown>;
    const direct = record.video_url;
    if (typeof direct === "string") return direct;

    const url = record.url;
    if (typeof url === "string" && /\.(mp4|mov|webm)(\?|$)/i.test(url)) {
      return url;
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        queue.push(...value);
      } else if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
}

function isFinished(status: string | null) {
  return status === "succeeded" || status === "success" || status === "completed";
}

function isFailed(status: string | null) {
  return status === "failed" || status === "error" || status === "cancelled";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      modelId,
      moduleType,
    } = body as {
      prompt?: string;
      modelId?: string;
      moduleType?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!VOLCENGINE_API_KEY) {
      return NextResponse.json(
        { error: "VOLCENGINE_API_KEY 未配置，无法生成视频" },
        { status: 500 }
      );
    }

    const createResponse = await fetch(`${ARK_BASE_URL}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId || DEFAULT_VIDEO_MODEL,
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
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

    const taskId = extractTaskId(createPayload);
    if (!taskId) {
      return NextResponse.json(
        { error: "视频任务已创建，但未返回 task id" },
        { status: 502 }
      );
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);

      const taskResponse = await fetch(
        `${ARK_BASE_URL}/contents/generations/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const taskPayload = (await taskResponse.json()) as TaskResponse;
      const status = extractStatus(taskPayload);
      const videoUrl = extractVideoUrl(taskPayload);

      if (videoUrl) {
        return NextResponse.json({
          video_url: videoUrl,
          status: status || "success",
          task_id: taskId,
          moduleType,
        });
      }

      if (!taskResponse.ok || isFailed(status)) {
        const errorMessage =
          typeof taskPayload.error === "string"
            ? taskPayload.error
            : `视频任务失败 (${status || taskResponse.status})`;
        return NextResponse.json({ error: errorMessage, task_id: taskId }, { status: 502 });
      }

      if (isFinished(status)) {
        break;
      }
    }

    return NextResponse.json(
      { error: "视频生成超时，请稍后重试", task_id: taskId },
      { status: 504 }
    );
  } catch (error) {
    console.error("[VideoGen] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate video" },
      { status: 500 }
    );
  }
}
