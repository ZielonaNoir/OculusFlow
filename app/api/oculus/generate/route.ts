import { NextResponse } from "next/server";

const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || "";
const DOUBAO_ENDPOINT_ID = process.env.DOUBAO_ENDPOINT_ID || "ep-20250218-placeholder";
const BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

const STYLE_NAMES: Record<number, string> = {
  0: "权威背书型 (Authority)",
  1: "情感共鸣型 (Empathy)",
  2: "性价比型 (Value)",
};

const STYLE_TONES: Record<number, string> = {
  0: "专业权威、数据驱动、强调认证与销量背书",
  1: "温暖共情、场景化叙事、强调用户真实感受",
  2: "直接高效、突出性价比、强调成分含量与价格优势",
};

function buildSystemPrompt(): string {
  return `你是一位顶级的京东电商详情页策划专家，精通保健品、快消品的内容营销。
你的任务是根据用户提供的产品信息，生成结构化的京东详情页内容方案。

输出格式要求（严格遵守JSON格式，不要输出任何其他内容）：
{
  "variants": [
    {
      "id": "variant_A",
      "style_name": "风格名称",
      "description": "策略描述（一句话）",
      "modules": [
        {
          "module_type": "hero_section",
          "display_title": "首屏海报",
          "copy_overlay": "主标题\\n副标题\\n行动号召",
          "image_prompt": "中文图片生成提示词，详细描述画面构图、风格、色调、主体元素"
        }
      ]
    }
  ]
}

每个方案必须包含以下8个模块（按顺序）：
1. hero_section（首屏海报）
2. pain_points（痛点场景）
3. solution（解决方案）
4. ingredients（成分可视化）
5. mechanism（科学原理）
6. craftsmanship（工艺体验）
7. specs（参数表）
8. footer（页尾保障）

image_prompt 必须使用中文，详细描述：构图方式、光线氛围、色调风格、主体元素、画面细节。
面向即梦AI图像生成模型，风格词参考：极简医疗风、科技感、温暖生活流、高端奢华、国潮风等。
示例格式："产品特写，白色简洁背景，柔和自然光，高端质感，医疗级专业感，画面中央放置产品，周围点缀天然原料，2K超清，商业摄影风格"`;
}

function buildUserPrompt(body: Record<string, string>, variantIndex: number): string {
  const {
    productName,
    coreSpecs,
    targetAudience,
    painPoints,
    trustEndorsement,
    visualStyle,
    sellingMode,
  } = body;

  return `请为以下保健品生成第${variantIndex + 1}套详情页方案（风格：${STYLE_NAMES[variantIndex]}，语气：${STYLE_TONES[variantIndex]}）：

产品名称：${productName}
核心规格：${coreSpecs}
目标人群：${targetAudience}
用户痛点：${painPoints}
信任背书：${trustEndorsement}
视觉风格：${visualStyle}
促销模式：${sellingMode || "无"}

要求：
- copy_overlay 使用中文，简洁有力，每行用\\n分隔
- image_prompt 使用中文，面向即梦AI，描述构图/光线/色调/主体/风格，100字以内
- 所有文案必须紧密结合产品特性，不要使用通用模板
- 输出完整JSON，variant id 为 "variant_${String.fromCharCode(65 + variantIndex)}"`;
}

export async function POST(req: Request) {
  const abortController = new AbortController();

  // 监听客户端断开
  req.signal?.addEventListener("abort", () => {
    abortController.abort();
  });

  try {
    const body = await req.json();
    const { sampleCount = 1 } = body;

    const count = Math.min(Math.max(Number(sampleCount), 1), 3);

    // 如果没有配置 API Key，返回增强版 mock 数据
    if (!VOLCENGINE_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const variants = buildMockVariants(body, count);
      return NextResponse.json({ variants });
    }

    // 并行请求所有 variants
    const variantPromises = Array.from({ length: count }, async (_, i) => {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
        },
        body: JSON.stringify({
          model: DOUBAO_ENDPOINT_ID,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: buildUserPrompt(body, i) },
          ],
          temperature: 0.8,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Doubao API error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";

      try {
        const parsed = JSON.parse(content);
        // 支持两种返回格式
        const variant = parsed.variants?.[0] || parsed;
        variant.id = `variant_${String.fromCharCode(65 + i)}`;
        variant.style_name = variant.style_name || STYLE_NAMES[i];
        return variant;
      } catch {
        // JSON 解析失败时返回 mock
        return buildMockVariants(body, 1)[0];
      }
    });

    const variants = await Promise.all(variantPromises);
    return NextResponse.json({ variants });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Generation stopped" }, { status: 499 });
    }
    console.error("Error in generation:", error);
    // 降级到 mock
    try {
      const body = await req.json().catch(() => ({}));
      const variants = buildMockVariants(body, 1);
      return NextResponse.json({ variants });
    } catch {
      return NextResponse.json(
        { error: "Failed to generate content" },
        { status: 500 }
      );
    }
  }
}

// 增强版 Mock（当无 API Key 时使用，内容根据输入动态生成）
function buildMockVariants(body: Record<string, string>, count: number) {
  const { productName = "产品", targetAudience = "成人", painPoints = "健康问题", trustEndorsement = "权威认证", sellingMode = "" } = body;

  return Array.from({ length: count }, (_, i) => ({
    id: `variant_${String.fromCharCode(65 + i)}`,
    style_name: STYLE_NAMES[i] || "标准型",
    description: `基于${STYLE_TONES[i] || "标准策略"}的内容方案`,
    modules: [
      {
        module_type: "hero_section",
        display_title: "首屏海报",
        copy_overlay: `${productName}\n${trustEndorsement}\n${targetAudience}首选`,
        image_prompt: `${productName}产品特写，居中放置在发光展台上，${i === 0 ? "金色奖杯与TOP1徽章环绕，权威感十足" : i === 1 ? "温暖家庭生活背景，幸福感氛围" : "价格标签突出，性价比视觉强调"}，高端渐变背景，专业棚拍光效，2K超清商业摄影风格`,
      },
      {
        module_type: "pain_points",
        display_title: "痛点场景",
        copy_overlay: `你是否也有这些困扰？\n${painPoints.split("、").slice(0, 2).join("\n")}`,
        image_prompt: `四格分屏展示健康困扰场景，${painPoints}，情感化叙事构图，每格聚焦一个痛点场景`,
      },
      {
        module_type: "solution",
        display_title: "解决方案",
        copy_overlay: `${productName}，专为${targetAudience}设计\n科学配方，精准补充`,
        image_prompt: `${productName}产品低角度仰拍，放置在发光水晶展台上，四周环绕动态光线和分子结构可视化效果，深色高端背景，科技感十足，2K超清`,
      },
      {
        module_type: "ingredients",
        display_title: "成分可视化",
        copy_overlay: `天然成分，足量补充\n每粒精华，看得见的营养`,
        image_prompt: `科学信息图表布局，左侧成分图标配发光标签，右侧天然原料实物微距摄影，白色简洁背景，医疗插画风格，专业营养成分可视化设计`,
      },
      {
        module_type: "mechanism",
        display_title: "科学原理",
        copy_overlay: `科学配比，靶向吸收\n专业研发，有效成分`,
        image_prompt: `发光人体轮廓医学插画，蓝色X光透视风格，放大标注气泡展示吸收机制，深色背景配粒子特效，科技感医疗可视化，专业感强`,
      },
      {
        module_type: "craftsmanship",
        display_title: "工艺体验",
        copy_overlay: `先进工艺，锁住营养\n易吸收，不刺激`,
        image_prompt: `上下分屏微距摄影，上方：胶囊涂层极致特写，晶体质感细节，下方：${targetAudience}服用产品的温馨生活场景，暖光生活流风格`,
      },
      {
        module_type: "specs",
        display_title: "参数表",
        copy_overlay: `产品名称: ${productName}\n适用人群: ${targetAudience}\n${sellingMode ? `促销: ${sellingMode}` : "正品保障"}`,
        image_prompt: `简洁现代数据表格设计，深色背景配蓝色强调线条，双列产品参数布局，极简科技美学风格，清晰易读`,
      },
      {
        module_type: "footer",
        display_title: "页尾保障",
        copy_overlay: `${trustEndorsement}\n京东承诺：次日达 · 正品行货 · 售后无忧`,
        image_prompt: `页尾横幅设计，正品保障、极速配送、售后无忧三大图标排列，京东品牌色调，信任徽章布局，专业电商风格`,
      },
    ],
  }));
}

