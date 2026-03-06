import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const TEXT_ENDPOINT_ID = process.env.DOUBAO_ENDPOINT_ID || "";
const VISION_ENDPOINT_ID =
  process.env.VOLCENGINE_VISION_ENDPOINT_ID ||
  process.env.DOUBAO_ENDPOINT_ID ||
  "";

const volcengine = createOpenAI({
  apiKey: VOLCENGINE_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

/** fieldType -> system prompt for text-only generation (no image). */
const TEXT_PROMPTS: Record<string, string> = {
  "plan-name": `你是一个方案命名专家。根据用户已选的模块类型或当前上下文，生成一个简洁的中文方案名称，10字以内，用于模板/方案列表展示。直接输出名称，不要引号或前缀。`,
  "product-name": `你是电商文案专家。生成一个简短的产品名称示例，适合放在「产品名称」输入框，10-30字。直接输出，不要引号或前缀。`,
  "core-specs": `你是产品详情页文案专家。生成一段简短的核心规格参数示例（如尺寸、材质、重量等），适合即梦AI生图参考，1-3行。直接输出，不要引号或「规格：」等前缀。`,
  "target-audience": `你是用户画像专家。生成一段简短的目标人群描述示例，如「25-35岁都市白领、注重品质」等，1-2句。直接输出，不要引号或前缀。`,
  "pain-points": `你是用户洞察专家。生成一段简短的痛点场景描述示例，适合作为详情页或生图提示词，1-3句。直接输出，不要引号或前缀。`,
  "trust-endorsement": `你是信任背书文案专家。生成一段简短的榜单/销量/认证类背书示例，如「天猫品类TOP3、年销10万+」等，1-2句。直接输出，不要引号或前缀。`,
  "selling-mode": `你是促销文案专家。生成一段简短的促销信息示例，如「满减、赠品、物流」等，1-2句。直接输出，不要引号或前缀。`,
  "supplement-product": `你是保健品文案专家。生成一个保健品/营养品产品名称示例，如「进口鱼油软胶囊、益生菌冻干粉」，1-2个。直接输出，不要引号或前缀。`,
  "supplement-ingredients": `你是保健品成分文案专家。生成一段核心成分与卖点示例，如「NMN 500mg，NAD+ 前体」，1-2句。直接输出，不要引号或前缀。`,
  "supplement-audience": `你是保健品人群专家。生成一段目标人群示例，如「中老年人；40-65岁；注重心血管」。直接输出，不要引号或前缀。`,
  "supplement-scenario": `你是保健品场景专家。生成一段使用场景/健康诉求示例，如「护心血管、降甘油三酯、促进睡眠」。直接输出，不要引号或前缀。`,
  "apparel-category": `你是服装品类专家。生成一个服装品类示例，如「羽绒服、冲锋衣、卫衣」。直接输出一个或几个，不要引号或前缀。`,
  "apparel-audience": `你是服装人群专家。生成一段目标人群示例，如「儿童；中大童；110-175」。直接输出，不要引号或前缀。`,
  "template-name": `你是模板命名专家。根据类别或模块类型，生成一个简洁的 Prompt 模板名称，10字以内。直接输出，不要引号或前缀。`,
  "template-prompt": `你是即梦AI生图提示词专家。生成一段简短的中文 Prompt 示例，描述构图/光线/色调/主体/风格，适合作为模板内容，50-150字。直接输出，不要引号或「Prompt：」等前缀。`,
};

const DEFAULT_PROMPT = `你是一个通用文案助手。根据用户当前表单或上下文，生成一段简短、可直接填入输入框的中文内容，不超过 100 字。直接输出，不要引号或「内容：」等前缀。`;

export async function POST(req: Request) {
  if (!VOLCENGINE_API_KEY) {
    return NextResponse.json({ error: "VOLCENGINE_API_KEY 未配置" }, { status: 500 });
  }

  try {
    const body = (await req.json()) as {
      fieldType: string;
      context?: { images?: string[]; formData?: Record<string, unknown> };
    };
    const { fieldType, context } = body;
    if (!fieldType || typeof fieldType !== "string") {
      return NextResponse.json({ error: "请提供 fieldType" }, { status: 400 });
    }

    const images = context?.images;
    const formData = context?.formData ?? {};
    const hasImages = Array.isArray(images) && images.length > 0;

    if (hasImages && fieldType === "describe-image") {
      const content: Array<
        { type: "text"; text: string } | { type: "image"; image: string; mediaType?: string }
      > = [
        {
          type: "text",
          text: "请根据以下图片生成一段适合作为生图提示词的需求描述，包含款式品类、题材材质、设计元素、适合人群、风格调性，每次可略有不同侧重点。简洁，不超过200字。直接输出描述，不要前缀。",
        },
      ];
      for (const img of images.slice(0, 4)) {
        if (typeof img === "string" && (img.startsWith("data:") || img.startsWith("http"))) {
          const mime = img.startsWith("data:") ? img.match(/^data:([^;]+);/)?.[1] : undefined;
          content.push({ type: "image", image: img, ...(mime && { mediaType: mime }) });
        }
      }
      if (content.length === 1) {
        return NextResponse.json({ error: "没有有效的图片" }, { status: 400 });
      }
      if (!VISION_ENDPOINT_ID) {
        return NextResponse.json(
          { error: "未配置视觉模型接入点（VOLCENGINE_VISION_ENDPOINT_ID 或 DOUBAO_ENDPOINT_ID）" },
          { status: 500 }
        );
      }
      const model = volcengine.chat(VISION_ENDPOINT_ID);
      const { text } = await generateText({
        model,
        messages: [{ role: "user", content }],
        temperature: 0.8,
      });
      return NextResponse.json({ text: text?.trim() || "" });
    }

    if (!TEXT_ENDPOINT_ID) {
      return NextResponse.json(
        { error: "未配置文本模型接入点（DOUBAO_ENDPOINT_ID）" },
        { status: 500 }
      );
    }

    const systemPrompt = TEXT_PROMPTS[fieldType] ?? DEFAULT_PROMPT;
    const userMessage =
      Object.keys(formData).length > 0
        ? `当前表单或上下文（仅供参考）：\n${JSON.stringify(formData, null, 0)}\n\n请根据上述生成符合该字段要求的内容。`
        : "请直接生成符合该字段要求的一条示例内容。";

    const model = volcengine.chat(TEXT_ENDPOINT_ID);
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.75,
    });

    return NextResponse.json({ text: text?.trim() || "" });
  } catch (e) {
    console.error("[llm/fill]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 }
    );
  }
}
