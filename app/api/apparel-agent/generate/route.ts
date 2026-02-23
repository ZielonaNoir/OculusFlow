import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const volcengine = createOpenAI({
  apiKey: process.env.VOLCENGINE_API_KEY || "",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

const DOUBAO_ENDPOINT_ID = process.env.DOUBAO_ENDPOINT_ID || "ep-20250218-placeholder";

// Helper schemas matching types/apparel.ts
const SellingPointSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const MainImageSuggestionSchema = z.object({
  index: z.number(),
  concept: z.string(),
  suggestion: z.string(),
});

const PageSectionSchema = z.object({
  section: z.string(),
  content: z.string(),
});

const BuyerReviewSchema = z.object({
  persona: z.string(),
  content: z.string(),
});

const QnAItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export async function POST(req: Request) {
  const { category, targetAudience } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const writeData = (data: Record<string, unknown>) => {
        // Mocking the 'd:' Vercel AI stream protocol prefix
        controller.enqueue(encoder.encode(`d:${JSON.stringify([data])}\n`));
      };

      const model = volcengine.chat(DOUBAO_ENDPOINT_ID);

      try {
        // --- Agent 1: Vision Analyst ---
        writeData({ type: "phase", phase: "vision_analysis" });
        const visionResult = await generateObject({
          model,
          temperature: 0.7,
          prompt: `你是一个资深服饰视觉分析师。请针对【品类：${category}】，提取出服装的核心物理卖点和视觉卖点。输出3个最能打动人的卖点。`,
          schema: z.object({
            sellingPoints: z.array(SellingPointSchema),
          }),
        });

        // --- Agent 2: Psychologist ---
        writeData({ type: "phase", phase: "psychological_insight" });
        const psychoResult = await generateObject({
          model,
          temperature: 0.7,
          prompt: `你是一个资深消费人群心理分析师。请结合【客群：${targetAudience}】以及以下核心卖点，推导出至少3条他们在穿着此服装时的极度痛点、使用场景或渴望点：\n卖点：\n${JSON.stringify(visionResult.object.sellingPoints)}`,
          schema: z.object({
            scenarios: z.array(z.string()),
            painPointsAnalysis: z.string(),
          }),
        });

        // --- Agent 3: Copywriter ---
        writeData({ type: "phase", phase: "copywriting" });
        const copywriterResult = await generateObject({
          model,
          temperature: 0.8,
          prompt: `你是一个高转化率电商文案总监。请结合以下信息策划详情页核心买点和五张主图设计（自带痛点场景和卖点转化）：
          品类：${category}
          客群：${targetAudience}
          卖点：${JSON.stringify(visionResult.object.sellingPoints)}
          客群场景与痛点分析：${psychoResult.object.painPointsAnalysis} / ${JSON.stringify(psychoResult.object.scenarios)}`,
          schema: z.object({
            mainImages: z.array(MainImageSuggestionSchema),
            longPageStructure: z.array(PageSectionSchema),
          }),
        });

        // --- Agent 4: Reviewer/Critic ---
        writeData({ type: "phase", phase: "quality_review" });
        const reviewerResult = await generateObject({
          model,
          temperature: 0.7,
          prompt: `你是一个资深电商客服/评价包装专家，请根据以下策划案生成针对不同人设的极度逼真的买家秀（含情绪词）及常见高频QA防线规划：
          详情页主骨架：${JSON.stringify(copywriterResult.object.longPageStructure)}
          物理卖点：${JSON.stringify(visionResult.object.sellingPoints)}`,
          schema: z.object({
            reviews: z.array(BuyerReviewSchema),
            qna: z.array(QnAItemSchema),
          }),
        });

        // --- Compilation & Final Output ---
        writeData({ type: "phase", phase: "completed" });
        const finalResponse = {
          sellingPoints: visionResult.object.sellingPoints,
          scenarios: psychoResult.object.scenarios,
          mainImages: copywriterResult.object.mainImages,
          longPageStructure: copywriterResult.object.longPageStructure,
          reviews: reviewerResult.object.reviews,
          qna: reviewerResult.object.qna,
        };
        
        writeData({ type: "result", data: finalResponse });
        controller.close();
      } catch (error) {
        console.error("Multi-Agent Pipeline Failed:", error);
        writeData({ type: "phase", phase: "failed" });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
