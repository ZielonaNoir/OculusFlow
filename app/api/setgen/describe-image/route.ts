import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const VISION_ENDPOINT_ID =
  process.env.VOLCENGINE_VISION_ENDPOINT_ID ||
  process.env.DOUBAO_ENDPOINT_ID ||
  "";

const volcengine = createOpenAI({
  apiKey: VOLCENGINE_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

const SYSTEM_PROMPT = `你是一个商业视觉描述专家。根据用户上传的产品/场景图片，用一段话总结以下要素（可自由发挥，每次描述角度或侧重点可略有不同）：
款式品类、题材材质、设计元素、适合人群、风格调性。
要求：简洁、适合作为即梦AI生图的提示词，不超过 200 字。直接输出描述文案，不要输出「描述：」等前缀或其它解释。`;

export async function POST(req: Request) {
  if (!VOLCENGINE_API_KEY) {
    return NextResponse.json(
      { error: "VOLCENGINE_API_KEY 未配置" },
      { status: 500 }
    );
  }
  if (!VISION_ENDPOINT_ID) {
    return NextResponse.json(
      { error: "未配置视觉模型接入点（VOLCENGINE_VISION_ENDPOINT_ID 或 DOUBAO_ENDPOINT_ID）" },
      { status: 500 }
    );
  }

  try {
    const { images } = (await req.json()) as { images: string[] };
    if (!images?.length || !Array.isArray(images)) {
      return NextResponse.json(
        { error: "请提供至少一张图片（images 数组）" },
        { status: 400 }
      );
    }

    const content: Array<{ type: "text"; text: string } | { type: "image"; image: string; mediaType?: string }> = [
      { type: "text", text: "请根据以下图片生成一段适合作为生图提示词的需求描述，包含款式品类、题材材质、设计元素、适合人群、风格调性，每次可略有不同侧重点。" },
    ];
    for (const img of images.slice(0, 4)) {
      if (typeof img === "string" && (img.startsWith("data:") || img.startsWith("http"))) {
        const mime = img.startsWith("data:") ? img.match(/^data:([^;]+);/)?.[1] : undefined;
        content.push({ type: "image", image: img, ...(mime && { mediaType: mime }) });
      }
    }
    if (content.length === 1) {
      return NextResponse.json(
        { error: "没有有效的图片 URL 或 base64" },
        { status: 400 }
      );
    }

    const model = volcengine.chat(VISION_ENDPOINT_ID);
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      temperature: 0.8,
    });

    const description = text?.trim() || "";
    return NextResponse.json({ description });
  } catch (e) {
    console.error("[setgen/describe-image]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "生成描述失败" },
      { status: 500 }
    );
  }
}
