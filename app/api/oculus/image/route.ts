import { NextResponse } from "next/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

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
    const { prompt, moduleType, modelId, refImages, imageOptions } = body as {
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
    };

    // Use model from Settings, or fall back to Seedream 4.5
    const imageModel = modelId || "doubao-seedream-4-5-251128";
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

    console.log(`[ImageGen] model=${imageModel} module=${moduleType} mode=${mode} refImages=${refImageCount}`);

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
      console.error("[ImageGen] API error:", responseText);
      return NextResponse.json({
        image_url: getPlaceholder(moduleType),
        status: "api_error",
        error: responseText,
      });
    }

    const result = JSON.parse(responseText);

    // OpenAI-compatible response: data[0].url or data[0].b64_json
    const imageData = result?.data?.[0];
    if (imageData?.url) {
      console.log("[ImageGen] Returning success with url:", imageData.url);
      return NextResponse.json({ image_url: imageData.url, status: "success" });
    }
    if (imageData?.b64_json) {
      console.log("[ImageGen] Returning success with b64_json");
      return NextResponse.json({
        image_url: `data:image/png;base64,${imageData.b64_json}`,
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
