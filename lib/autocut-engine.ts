import type {
  AutoCutProjectRow,
  AutoCutSegmentResult,
  AutoCutSegmentRow,
} from "@/lib/autocut-workflow";

const ENGINE_URL = process.env.AUTOCUT_ENGINE_URL || "";
const ENGINE_REQUEST_TIMEOUT_MS = Number(process.env.AUTOCUT_ENGINE_TIMEOUT_MS || "12000");

type EngineResponse<T> = {
  ok: boolean;
  status: number;
  data: T;
};

async function requestEngine<T>(path: string, init?: RequestInit): Promise<EngineResponse<T>> {
  if (!ENGINE_URL) {
    throw new Error("AUTOCUT_ENGINE_URL 未配置");
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), ENGINE_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${ENGINE_URL}${path}`, {
      ...init,
      signal: init?.signal ?? timeoutController.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  const data = (await response.json()) as T;
  return { ok: response.ok, status: response.status, data };
}

export type EngineClipResult = {
  stage?: string;
  status: string;
  provider: string;
  source_url?: string | null;
  duration_ms: number | null;
  trim_start_ms?: number | null;
  trim_end_ms?: number | null;
  warning?: string | null;
  local_path?: string | null;
  public_url?: string | null;
  metadata: Record<string, unknown>;
};

export type EngineRenderJob = {
  job_id: string;
  stage?: string;
  status: string;
  items?: AutoCutSegmentResult[];
  warnings?: string[];
  stages?: Array<Record<string, unknown>>;
  output_url?: string | null;
  subtitle_url?: string | null;
  payload?: Record<string, unknown>;
  error?: string | null;
};

export async function triggerAutoCutRender(input: {
  project: AutoCutProjectRow;
  segments: AutoCutSegmentRow[];
  settings: Record<string, unknown>;
}) {
  return requestEngine<EngineRenderJob>("/v1/render-project", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getAutoCutRenderJob(jobId: string) {
  return requestEngine<EngineRenderJob>(`/v1/jobs/${jobId}`);
}

export async function fetchAutoCutClips(input: {
  project: AutoCutProjectRow;
  segments: AutoCutSegmentRow[];
}) {
  return requestEngine<{ items: EngineClipResult[] }>("/v1/fetch-clips", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
