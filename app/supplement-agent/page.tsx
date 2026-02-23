"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { SupplementInputForm } from "@/components/supplement-agent/SupplementInputForm";
import { SupplementPipelineTracker } from "@/components/supplement-agent/SupplementPipelineTracker";
import { SupplementOutputPanel } from "@/components/supplement-agent/SupplementOutputPanel";
import { type SupplementResponse, type SupplementAgentPhase } from "@/types/supplement";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

const CACHE_KEY = "supplement_agent_last_result";
const CONTEXT_CACHE_KEY = "supplement_agent_product_context";

export default function SupplementAgentPage() {
  const [phase, setPhase] = useState<SupplementAgentPhase>("idle");
  const [result, setResult] = useState<SupplementResponse | null>(null);
  const [productContext, setProductContext] = useState<{
    productName: string;
    coreIngredients: string;
    imagePreviews: string[];
    fourViewImages: string[];
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Load cached result on mount ---
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as SupplementResponse;
        setResult(parsed);
        setPhase("completed");
        toast.info("已加载缓存结果，点击「重新生成」可刷新", { duration: 3000 });
      }
    } catch { /* ignore */ }

    try {
      const cachedCtx = localStorage.getItem(CONTEXT_CACHE_KEY);
      if (cachedCtx) {
        setProductContext(JSON.parse(cachedCtx));
      }
    } catch { /* ignore */ }
  }, []);

  // --- Persist productContext whenever it changes ---
  useEffect(() => {
    if (!productContext) return;
    try {
      // Only cache name, specs, and fourViewImages — skip raw base64 imagePreviews to stay under quota
      const toCache = {
        productName: productContext.productName,
        coreIngredients: productContext.coreIngredients,
        imagePreviews: productContext.imagePreviews,
        fourViewImages: productContext.fourViewImages,
      };
      localStorage.setItem(CONTEXT_CACHE_KEY, JSON.stringify(toCache));
    } catch { /* quota exceeded — ignore */ }
  }, [productContext]);

  const handleGenerate = useCallback(async (formData: {
    productName: string;
    coreIngredients: string;
    targetAudience: string;
    healthGoals: string;
    images: File[];
    imagePreviews: string[];
  }) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setProductContext({
      productName: formData.productName,
      coreIngredients: formData.coreIngredients,
      imagePreviews: formData.imagePreviews,
      fourViewImages: [],
    });
    setResult(null);
    setPhase("idle");

    try {
      const response = await fetch("/api/supplement-agent/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formData.productName,
          coreIngredients: formData.coreIngredients,
          targetAudience: formData.targetAudience,
          healthGoals: formData.healthGoals,
          images: formData.images.map(f => f.name),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("API call failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("d:")) {
            try {
              const parsedArray = JSON.parse(line.slice(2));
              const data = Array.isArray(parsedArray) ? parsedArray[0] : parsedArray;

              if (data?.type === "phase") {
                setPhase(data.phase as SupplementAgentPhase);
              } else if (data?.type === "result") {
                const resultData = data.data as SupplementResponse;
                setResult(resultData);
                // Persist to localStorage for next visit
                localStorage.setItem(CACHE_KEY, JSON.stringify(resultData));
                toast.success("保健品全案生成完毕！已自动缓存到本地。");
              }
            } catch {
              console.error("Failed to parse stream chunk:", line);
            }
          }
        }
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error(err);
        setPhase("failed");
        toast.error("生成失败，请重试");
      } else if (!(err instanceof Error)) {
        console.error(err);
        setPhase("failed");
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPhase("idle");
    toast.info("已终止生成任务");
  };

  const handleReset = () => {
    setResult(null);
    setPhase("idle");
    setProductContext(null);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem("supplement_agent_images");
    localStorage.removeItem(CONTEXT_CACHE_KEY);
    toast.info("缓存已清除，请重新填写并生成");
  };

  const handleFourViewsGenerated = (urls: string[]) => {
    setProductContext(prev => prev ? { ...prev, fourViewImages: urls } : null);
  };

  const handlePreviewsChange = useCallback((previews: string[]) => {
    setProductContext(prev => {
      // If we don't have a product context yet, we just stub one out so we can track images
      if (!prev) {
        return {
          productName: "",
          coreIngredients: "",
          imagePreviews: previews,
          fourViewImages: [],
        };
      }
      return { ...prev, imagePreviews: previews };
    });
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-screen p-4 md:p-6 lg:p-8 gap-6 overflow-hidden bg-zinc-950">
      {/* Left Panel - Input */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[420px] shrink-0 overflow-y-auto custom-scrollbar rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex flex-col"
      >
        <div className="mb-6 shrink-0">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Icon icon="lucide:flask-conical" className="h-6 w-6 text-teal-400" />
            Supplement Agent
          </h1>
          <p className="text-sm text-zinc-400 mt-1">保健品详情页多智能体工作流</p>
        </div>

        <SupplementInputForm
          onGenerate={handleGenerate}
          isGenerating={phase !== "idle" && phase !== "completed" && phase !== "failed"}
          onStop={handleStop}
          onFourViewsGenerated={handleFourViewsGenerated}
          onPreviewsChange={handlePreviewsChange}
        />
      </motion.div>

      {/* Right Panel - Progress & Output */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col gap-6 overflow-hidden"
      >
        {/* Pipeline Tracker */}
        <div className="shrink-0">
          <SupplementPipelineTracker currentPhase={phase} />
        </div>

        {/* Output Area */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl relative">
          {phase === "idle" && !result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
              <Icon icon="lucide:flask-conical" className="h-10 w-10 mb-4 opacity-50" />
              <p>输入产品信息以启动保健品策划智能体矩阵</p>
            </div>
          )}

          {phase === "failed" && !result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
              <Icon icon="lucide:alert-triangle" className="h-10 w-10 mb-4" />
              <p>任务中断或发生错误，请重试</p>
            </div>
          )}

          {result && (phase === "completed" || phase === "idle") && (
            <SupplementOutputPanel
              data={result}
              productContext={productContext ?? undefined}
              onReset={handleReset}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
