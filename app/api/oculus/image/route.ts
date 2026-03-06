import { NextResponse } from "next/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

/** 前端展示名与火山方舟图片 API 实际 Model ID 的映射（文档示例：doubao-seedream-5-0-260128） */
const IMAGE_MODEL_ID_MAP: Record<string, string> = {
  "doubao-seedream-5-0-lite": "doubao-seedream-5-0-260128",
};

// Modules that skip AI image generation (frontend renders them)
const FRONTEND_MODULES = ["specs", "footer"];

// Placeholder colors per module type
const MODULE_COLORS: Record<string, string> = {
  hero_section: "1e3a5f/93c5fd",
  pain_points: "1a1a1a/6b7280",
  solution: "0f2027/60a5fa",
  ingredients: "f0fdf4/16a34a",
  mechanism: "0c1445/818cf8",
  craftsmanship: "1c1917/d97706",
};

function getPlaceholder(moduleType: string): string {
  const color = MODULE_COLORS[moduleType] || "18181b/71717a";
  return `https://placehold.co/1024x1024/${color}?text=${encodeURIComponent(moduleType.replace(/_/g, "+"))}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      moduleType,
      modelId,
      refImages,
      imageOptions,
      projectId,
      generationKind,
      metadataSnapshot,
      selectedCell,
    } = body as {
      prompt: string;
      moduleType: string;
      modelId?: string;
      refImages?: string[];
      imageOptions?: {
        size?: string;
        seed?: number;
        guidanceScale?: number;
        watermark?: boolean;
        responseFormat?: "url" | "b64_json";
        sequentialImageGeneration?: "auto" | "disabled";
        maxImages?: number;
        optimizePromptMode?: "standard" | "fast";
      };
      projectId?: string;
      generationKind?: string;
      metadataSnapshot?: Record<string, unknown>;
      selectedCell?: Record<string, unknown>;
    };

    // 优先使用环境变量中的推理接入点 ID；否则使用请求中的 modelId，并映射为方舟文档中的 Model ID。
    const requestedModel = modelId || "doubao-seedream-4-5-251128";
    const imageModel =
      process.env.VOLCENGINE_IMAGE_ENDPOINT_ID ||
      IMAGE_MODEL_ID_MAP[requestedModel] ||
      requestedModel;
    const refImageCount = refImages?.length || 0;
    const mode = refImageCount > 0 ? "img2img" : "t2i";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Four-view generation requires at least one reference image
    if (moduleType === "four_view" && (!refImages || refImages.length === 0)) {
      return NextResponse.json(
        { error: "四视图生成需要至少一张参考图" },
        { status: 400 }
      );
    }

    // M07/M08 — frontend renders, no AI image needed
    if (FRONTEND_MODULES.includes(moduleType)) {
      return NextResponse.json({ image_url: null, status: "frontend_render" });
    }

    // No API key — return colored placeholder
    if (!VOLCENGINE_API_KEY) {
      console.warn("[ImageGen] No VOLCENGINE_API_KEY, returning placeholder");
      return NextResponse.json({
        image_url: getPlaceholder(moduleType),
        status: "mock",
      });
    }

    console.log(
      `[ImageGen] model=${imageModel} module=${moduleType} mode=${mode} refImages=${refImageCount} size=${imageOptions?.size ?? "default"}`
    );

    // 火山方舟 4.5 文档 https://www.volcengine.com/docs/82379/1541523
    const opt = imageOptions ?? {};
    const apiBody: Record<string, unknown> = {
      model: imageModel,
      prompt,
      size: opt.size ?? "2048x2048",
      response_format: opt.responseFormat ?? "url",
      watermark: opt.watermark ?? true,
      seed: opt.seed !== undefined ? opt.seed : -1,
      sequential_image_generation: opt.sequentialImageGeneration ?? "disabled",
      stream: false,
    };
    if (refImages && refImages.length > 0) {
      apiBody.image = refImages.length === 1 ? refImages[0] : refImages;
    }
    if (opt.guidanceScale !== undefined) {
      apiBody.guidance_scale = opt.guidanceScale;
    }
    if (opt.sequentialImageGeneration === "auto" && opt.maxImages !== undefined) {
      apiBody.sequential_image_generation_options = { max_images: opt.maxImages };
    }
    if (opt.optimizePromptMode !== undefined) {
      apiBody.optimize_prompt_options = { mode: opt.optimizePromptMode };
    }

    const apiResponse = await fetch(`${ARK_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
      },
      body: JSON.stringify(apiBody),
    });

    const responseText = await apiResponse.text();
    console.log(
      "[ImageGen] Response status:",
      apiResponse.status,
      "body:",
      responseText.slice(0, 400)
    );

    if (!apiResponse.ok) {
      let errMessage = responseText;
      try {
        const errJson = JSON.parse(responseText) as { error?: { message?: string }; message?: string };
        errMessage = errJson?.error?.message ?? errJson?.message ?? responseText;
      } catch {
        // use raw responseText
      }
      console.error("[ImageGen] Ark API error:", apiResponse.status, errMessage);
      return NextResponse.json(
        {
          image_url: null,
          status: "api_error",
          error: errMessage || `火山引擎接口错误 ${apiResponse.status}`,
        },
        { status: 502 }
      );
    }

    const result = JSON.parse(responseText);

    // OpenAI-compatible response: data[0].url or data[0].b64_json
    const imageData = result?.data?.[0];
    if (imageData?.url) {
      console.log("[ImageGen] Returning success with url:", imageData.url);
      await persistWorkflowTask({
        projectId,
        stepKey: generationKind || moduleType,
        modelId: imageModel,
        prompt,
        imageOptions: imageOptions ?? {},
        resultUrl: imageData.url,
        metadataSnapshot,
        selectedCell,
      });
      return NextResponse.json({ image_url: imageData.url, status: "success" });
    }
    if (imageData?.b64_json) {
      console.log("[ImageGen] Returning success with b64_json");
      const imageUrl = `data:image/png;base64,${imageData.b64_json}`;
      await persistWorkflowTask({
        projectId,
        stepKey: generationKind || moduleType,
        modelId: imageModel,
        prompt,
        imageOptions: imageOptions ?? {},
        resultUrl: imageUrl,
        metadataSnapshot,
        selectedCell,
      });
      return NextResponse.json({
        image_url: imageUrl,
        status: "success",
      });
    }

    console.warn("[ImageGen] No image in response:", result);
    return NextResponse.json({
      image_url: getPlaceholder(moduleType),
      status: "empty",
      raw: result,
    });
  } catch (error) {
    console.error("[ImageGen] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}

async function persistWorkflowTask(input: {
  projectId?: string;
  stepKey: string;
  modelId: string;
  prompt: string;
  imageOptions: Record<string, unknown>;
  resultUrl: string;
  metadataSnapshot?: Record<string, unknown>;
  selectedCell?: Record<string, unknown>;
}) {
  if (!input.projectId) return;
  try {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("video_generation_tasks").insert({
      project_id: input.projectId,
      user_id: user.id,
      task_type: "image",
      step_key: input.stepKey,
      status: "succeeded",
      model_id: input.modelId,
      prompt: input.prompt,
      params_snapshot: input.imageOptions,
      result_url: input.resultUrl,
      result_payload: {
        metadata_snapshot: input.metadataSnapshot ?? {},
        selected_cell: input.selectedCell ?? {},
      },
    });
  } catch (error) {
    console.error("[ImageGen] persist task error:", error);
  }
}
