import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const volcengine = createOpenAI({
  apiKey: process.env.VOLCENGINE_API_KEY || "",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

const DOUBAO_ENDPOINT_ID = process.env.DOUBAO_ENDPOINT_ID || "ep-20250218-placeholder";

/** Extract the first JSON object/array from a model response that may wrap it in ```json ``` */
function extractJSON<T>(text: string): T {
  // Strip markdown code fences
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/gi, "").trim();
  // Find first { or [
  const start = stripped.search(/[\[{]/);
  const end = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);
  return JSON.parse(stripped.slice(start, end + 1)) as T;
}

export async function POST(req: Request) {
  const { productName, coreIngredients, targetAudience, healthGoals } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const writeData = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`d:${JSON.stringify([data])}\n`));
      };

      const model = volcengine.chat(DOUBAO_ENDPOINT_ID);

      try {
        // --- Agent 1：成分解析专家 ---
        writeData({ type: "phase", phase: "ingredient_analysis" });
        const agent1 = await generateText({
          model,
          temperature: 0.6,
          prompt: `你是一位专业的保健品/营养品成分解析专家。请针对以下产品进行科学成分分析：
产品名称：${productName}
核心成分/原料：${coreIngredients}
健康诉求：${healthGoals}

请从每种核心成分中提取 3-5 个具体的、由科学研究支持的人体生理功效点。
注意：只提取客观的成分功效，不要进行夸大或绝对化的健康声称。

严格以如下 JSON 格式输出（不要输出任何其他内容）：
{
  "ingredientProfiles": [
    { "ingredient": "成分名称", "mechanism": "科学作用机制简述", "bodyBenefit": "通俗对人体的好处" }
  ],
  "keyFunctionalClaims": ["功效点1", "功效点2", "功效点3"]
}`,
        });
        const ingredientResult = extractJSON<{
          ingredientProfiles: { ingredient: string; mechanism: string; bodyBenefit: string }[];
          keyFunctionalClaims: string[];
        }>(agent1.text);

        // --- Agent 2：健康人群洞察专家 ---
        writeData({ type: "phase", phase: "audience_insight" });
        const agent2 = await generateText({
          model,
          temperature: 0.7,
          prompt: `你是一位消费者健康心理分析专家，专精于保健品/营养品的市场人群研究。

目标客群：${targetAudience}
产品健康诉求：${healthGoals}
产品成分功效点：${JSON.stringify(ingredientResult.keyFunctionalClaims)}

请深度分析这类人群的日常生活健康困扰场景、购买保健品的核心痛点和心理动因、最在意的产品安全性和效果信任背书，以及最佳消费场景。

严格以如下 JSON 格式输出（不要输出任何其他内容）：
{
  "scenarios": ["场景1", "场景2", "场景3", "场景4", "场景5"],
  "painPoints": ["痛点1", "痛点2", "痛点3"],
  "trustDrivers": ["信任因素1", "信任因素2", "信任因素3"],
  "usageContext": "产品的最佳使用场景描述"
}`,
        });
        const audienceResult = extractJSON<{
          scenarios: string[];
          painPoints: string[];
          trustDrivers: string[];
          usageContext: string;
        }>(agent2.text);

        // --- Agent 3：健康文案转换专家 ---
        writeData({ type: "phase", phase: "benefit_translation" });
        const agent3 = await generateText({
          model,
          temperature: 0.8,
          prompt: `你是一位精通保健品电商文案的高级文案总监，深谙"成分卖点→消费者利益转化"的降维翻译艺术。

产品名：${productName}，目标客群：${targetAudience}
成分分析：${JSON.stringify(ingredientResult.ingredientProfiles)}
人群痛点：${JSON.stringify(audienceResult.painPoints)}
消费场景：${JSON.stringify(audienceResult.scenarios)}
信任因素：${JSON.stringify(audienceResult.trustDrivers)}

你必须将晦涩的成分参数翻译为消费者能立刻感受到的"人话"，格式遵循："触发场景 + 解决的具体困扰 + 带来的通俗体感感受"

输出5-7条核心功效买点、10张高转化详情页主图视觉方向、7-9个详情页板块。

特别要求：关于 [mainImages] 数组，请提供正好 10 个场景，要求涵盖极简健康科技美学、高端广告大片质感。每个场景请根据产品特色（如适用）对应以下通用大类框架进行定制：
1. 溯源场景（原产地/自然环境，如：阳光下的新西兰牧场、纯净的深海、东北黑土地的非转基因大豆田，强调天然安全）
2. 成分微观图（高科技感的细胞/分子/发光蛋白体，或微距下成分的高级质感）
3. 动态融合效果（如：水珠飞溅、粉末爆开、两种原料在空中丝滑碰撞融合的瞬间）
4. 科学图解/UI底图（如：医疗级的半透明线框、膳食宝塔光影、科学比例金字塔）
5. 核心卖点主图 1（高端生活方式，大理石或自然材质托盘，光影柔和）
6. 核心卖点主图 2（纯净极简风，产品居中，大面积留白+高级倒影，适合放Slogan）
7. 痛点对比暗示图（左暗淡枯萎 vs 右明亮饱满，用概念化的隐喻表达使用前后的状态对比）
8. 食用状态/冲泡解压图（如：温水冲泡时丝滑溶解的漩涡、凝露边缘的高光水滴质感）
9. 情绪价值/共鸣图（充满治愈感或活力的抽象环境光背景、温馨家庭或职场精英的氛围光影）
10. 权威信任感背书底图（深邃色调，金色/银色高级反光光晕，适合放置各类获奖证书或认证徽章的质感底座）

严格以如下 JSON 格式输出（不要输出任何其他内容）：
{
  "efficacyClaims": [
    { "title": "买点标题", "description": "买点详细描述（消费者人话）" }
  ],
  "mainImages": [
    { "index": 1, "concept": "主图概念（如：溯源场景 - 新西兰阳光牧场）", "suggestion": "画面设计详细建议（写明光影、构图、色调、材质要求）" }
  ],
  "longPageStructure": [
    { "section": "板块名称", "content": "该板块的主要内容和文案思路" }
  ]
}`,
        });
        const copywriterResult = extractJSON<{
          efficacyClaims: { title: string; description: string }[];
          mainImages: { index: number; concept: string; suggestion: string }[];
          longPageStructure: { section: string; content: string }[];
        }>(agent3.text);

        // --- Agent 4：合规专家审核 ---
        writeData({ type: "phase", phase: "compliance_review" });
        const agent4 = await generateText({
          model,
          temperature: 0.5,
          prompt: `你是一位精通《广告法》、《食品安全法》及保健品电商平台合规审核规则的法务顾问。

请针对以下保健品文案进行全面的合规审核：
产品功效声称：${JSON.stringify(copywriterResult.efficacyClaims)}
目标客群：${targetAudience}

检查内容：
1. 识别绝对化词汇（最好、唯一、神奇、根治、治愈等）
2. 识别违规疾病治疗性声称
3. 为每个违规用词提供合规的替换版本
4. 审核通过后，为不同人设生成8-10组真实的用户使用体验评价
5. 预判常见的用户疑虑，生成6-8组Q&A官方话术

严格以如下 JSON 格式输出（不要输出任何其他内容）：
{
  "complianceNotes": [
    { "claim": "原始违规表述", "compliantVersion": "合规替换版本" }
  ],
  "reviews": [
    { "persona": "用户人设（如：35岁健身白领）", "content": "用户评价内容" }
  ],
  "qna": [
    { "question": "用户常见问题", "answer": "官方话术回答" }
  ]
}`,
        });
        const complianceResult = extractJSON<{
          complianceNotes: { claim: string; compliantVersion: string }[];
          reviews: { persona: string; content: string }[];
          qna: { question: string; answer: string }[];
        }>(agent4.text);

        // --- 组装最终输出 ---
        writeData({ type: "phase", phase: "completed" });
        const finalResponse = {
          efficacyClaims: copywriterResult.efficacyClaims,
          scenarios: audienceResult.scenarios,
          mainImages: copywriterResult.mainImages,
          longPageStructure: copywriterResult.longPageStructure,
          reviews: complianceResult.reviews,
          qna: complianceResult.qna,
          complianceNotes: complianceResult.complianceNotes,
        };

        writeData({ type: "result", data: finalResponse });
        controller.close();
      } catch (error) {
        console.error("Supplement Agent Pipeline Failed:", error);
        writeData({ type: "phase", phase: "failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
