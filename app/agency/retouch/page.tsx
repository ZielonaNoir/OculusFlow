"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { WorkflowStepper, Step } from "@/components/agency/WorkflowStepper";
import { toast } from "sonner";
import { useUser } from "@/components/UserProvider";
import { Label } from "@/components/ui/label";
import { FieldWithAIFill } from "@/components/ui/input-with-ai-fill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  getSizeFromOptions,
  ASPECT_RATIO_OPTIONS,
  CLARITY_OPTIONS,
} from "@/lib/retouch-utils";

const STEPS: Step[] = [
  { id: "upload", label: "批量上传", subLabel: "支持 JPG/PNG/WebP" },
  { id: "process", label: "智能处理", subLabel: "并行计算边缘抠图" },
  { id: "upscale", label: "高清放大", subLabel: "AI 超分四倍增强" },
  { id: "batch", label: "打包下载", subLabel: "高清成品一键导出" },
];

const FEATURES = [
  { id: "bg-remove", name: "智能抠图", icon: "lucide:scissors", cost: 2 },
  { id: "upscale", name: "4K 放大", icon: "lucide:maximize", cost: 5 },
  { id: "cleanup", name: "瑕疵消除", icon: "lucide:eraser", cost: 3 },
  { id: "color", name: "自动调色", icon: "lucide:palette", cost: 1 },
];

const BACKGROUND_OPTIONS = [
  { value: "original", label: "原图背景" },
  { value: "white", label: "白底图" },
] as const;

const IMAGE_MODEL_KEY = "oculus_image_model";
const DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-lite";

export default function RetouchPage() {
  const { user, credits } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "bg-remove",
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [background, setBackground] = useState<"white" | "original">(
    "original"
  );
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [clarity, setClarity] = useState("2K");
  const [resultUrls, setResultUrls] = useState<(string | null)[]>([]);
  const [isSavingToWorks, setIsSavingToWorks] = useState(false);

  const featureCostPerImage = selectedFeatures.reduce((acc, f) => {
    const feature = FEATURES.find((feat) => feat.id === f);
    return acc + (feature?.cost || 0);
  }, 0);
  const totalCost = (files.length || 1) * featureCostPerImage;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      const readers = newFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (prev) => resolve(prev.target?.result as string);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then((results) =>
        setFiles((prev) => [...prev, ...results].slice(0, 100))
      );
    }
  };

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const startBatchProcess = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error("请填写描述或修改意图，越详细越容易出好图");
      return;
    }

    // 有图为图生图，无图为文生图（单次生成）
    const refs = files.length > 0 ? files : [];

    if (credits && credits.credit_balance < totalCost) {
      toast.error("积分余额不足，请充值后继续");
      return;
    }

    const finalPrompt =
      background === "white"
        ? `${trimmedPrompt}，纯白背景`
        : trimmedPrompt;
    const size = getSizeFromOptions(clarity, aspectRatio);
    const modelId =
      typeof window !== "undefined"
        ? localStorage.getItem(IMAGE_MODEL_KEY) || DEFAULT_IMAGE_MODEL
        : DEFAULT_IMAGE_MODEL;

    setIsProcessing(true);
    setCurrentStep(1);
    setResultUrls([]);

    const results: (string | null)[] = [];
    const total = refs.length || 1;

    const payloadSummary = {
      prompt: finalPrompt.slice(0, 80) + (finalPrompt.length > 80 ? "…" : ""),
      promptLength: finalPrompt.length,
      moduleType: "retouch",
      modelId,
      size,
      refImagesCount: refs.length,
      totalRequests: total,
    };
    console.log("[Retouch] 请求参数摘要:", payloadSummary);

    for (let i = 0; i < total; i++) {
      if (i > 0 && i % 3 === 0) setCurrentStep(2);
      try {
        const body = {
          prompt: finalPrompt,
          moduleType: "retouch",
          modelId,
          refImages: refs.length > 0 ? [refs[i]] : undefined,
          imageOptions: { size },
        };
        const res = await fetch("/api/oculus/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          image_url?: string | null;
          error?: string;
          status?: string;
        };
        if (!res.ok) {
          const errMsg = data.error || (total > 1 ? `第 ${i + 1} 张处理失败` : "生成失败");
          console.warn("[Retouch] 请求失败:", res.status, data);
          toast.error(errMsg);
          results.push(null);
        } else {
          const url = data.image_url ?? null;
          if (!url && data.status !== "frontend_render") {
            console.warn("[Retouch] 响应无图片:", data);
            toast.error(data.error || "接口未返回图片");
          }
          results.push(url);
        }
      } catch (e) {
        console.error("[Retouch] 请求异常:", e);
        toast.error(total > 1 ? `第 ${i + 1} 张请求失败` : "请求失败，请查看控制台");
        results.push(null);
      }
    }

    setCurrentStep(3);
    setIsProcessing(false);
    setResultUrls(results);
    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
      toast.success(
        total > 1
          ? `批量处理完成！成功 ${successCount}/${total} 张，已消耗 ${totalCost} 积分`
          : "生成成功"
      );
    }
  };

  const canSubmit =
    prompt.trim().length > 0 &&
    !isProcessing &&
    (credits?.credit_balance ?? 0) >= totalCost;

  const successResults = resultUrls.filter((u): u is string => Boolean(u));
  const canDownload = successResults.length > 0 && !isProcessing;

  const handleDownloadAll = async () => {
    if (successResults.length === 0) return;
    toast.info(`正在准备下载 ${successResults.length} 张图片…`);
    for (let i = 0; i < successResults.length; i++) {
      const url = successResults[i];
      const name = `retouch-${i + 1}.png`;
      try {
        if (url.startsWith("data:")) {
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          a.click();
        } else {
          const res = await fetch(url, { mode: "cors" });
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = name;
          a.click();
          URL.revokeObjectURL(blobUrl);
        }
      } catch {
        window.open(url, "_blank");
      }
      if (i < successResults.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    toast.success(`已触发下载 ${successResults.length} 张图片，请查看浏览器下载栏`);
  };

  const handleSaveToWorks = async () => {
    if (successResults.length === 0 || !user) {
      if (!user) toast.error("请先登录后再保存到我的作品");
      return;
    }
    setIsSavingToWorks(true);
    let saved = 0;
    for (let i = 0; i < successResults.length; i++) {
      const urlOrData = successResults[i];
      try {
        const body =
          urlOrData.startsWith("data:")
            ? { data_url: urlOrData, type: "image" as const, source: "retouch" }
            : { url: urlOrData, type: "image" as const, source: "retouch" };
        const res = await fetch("/api/assets/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(data.error || "保存失败");
          break;
        }
        saved++;
      } catch {
        toast.error("保存请求失败");
        break;
      }
    }
    setIsSavingToWorks(false);
    if (saved > 0) {
      toast.success(`已保存 ${saved} 张到我的作品`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-2">
            AI <span className="font-semibold italic font-serif">Retouch</span>
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide">
            图片精修：工业级批量处理，让每一张图都具备顶级摄影质感
          </p>
        </header>

        <WorkflowStepper
          steps={STEPS}
          currentStepIndex={currentStep}
          className="mb-20"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                描述 / 提示词
              </Label>
              <FieldWithAIFill
                value={prompt}
                onChange={setPrompt}
                variant="textarea"
                placeholder="描述你想要的画面，或对参考图的修改意图…越详细越容易出好图；或上传图片后点击「AI 填充」"
                disabledWhen={files.length === 0}
                disabledHint="请先上传图片"
                inputClassName="min-h-[100px] rounded-xl border-white/10 bg-zinc-900/80 text-white placeholder:text-zinc-500 focus-visible:ring-violet-500/50 resize-y"
                onFill={async () => {
                  const res = await fetch("/api/llm/fill", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      fieldType: "describe-image",
                      context: { images: files },
                    }),
                  });
                  const data = (await res.json()) as { text?: string; error?: string };
                  if (!res.ok) {
                    toast.error(data.error || "生成失败");
                    return "";
                  }
                  const text = data.text ?? "";
                  if (text) toast.success("已根据图片生成描述，可再次点击以刷新不同表述");
                  return text;
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                背景设置
              </Label>
              <Select
                value={background}
                onValueChange={(v) => setBackground(v as "white" | "original")}
              >
                <SelectTrigger className="rounded-xl border-white/10 bg-zinc-900/80 text-white transition-all duration-200 hover:border-white/20 hover:bg-zinc-800/80 focus:ring-violet-500/50 data-[state=open]:border-violet-500/40 data-[state=open]:ring-2 data-[state=open]:ring-violet-500/20 data-[state=open]:shadow-[0_0_14px_rgba(139,92,246,0.12)] h-auto py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950/95">
                  {BACKGROUND_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-white transition-colors duration-150 hover:bg-violet-500/15 focus:bg-violet-500/25 focus:text-violet-200 data-[highlighted]:bg-violet-500/20 data-[highlighted]:text-violet-200"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                比例
              </Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="rounded-xl border-white/10 bg-zinc-900/80 text-white transition-all duration-200 hover:border-white/20 hover:bg-zinc-800/80 focus:ring-violet-500/50 data-[state=open]:border-violet-500/40 data-[state=open]:ring-2 data-[state=open]:ring-violet-500/20 data-[state=open]:shadow-[0_0_14px_rgba(139,92,246,0.12)] h-auto py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950/95">
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-white transition-colors duration-150 hover:bg-violet-500/15 focus:bg-violet-500/25 focus:text-violet-200 data-[highlighted]:bg-violet-500/20 data-[highlighted]:text-violet-200"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                清晰度
              </Label>
              <Select value={clarity} onValueChange={setClarity}>
                <SelectTrigger className="rounded-xl border-white/10 bg-zinc-900/80 text-white transition-all duration-200 hover:border-white/20 hover:bg-zinc-800/80 focus:ring-violet-500/50 data-[state=open]:border-violet-500/40 data-[state=open]:ring-2 data-[state=open]:ring-violet-500/20 data-[state=open]:shadow-[0_0_14px_rgba(139,92,246,0.12)] h-auto py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950/95">
                  {CLARITY_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-white transition-colors duration-150 hover:bg-violet-500/15 focus:bg-violet-500/25 focus:text-violet-200 data-[highlighted]:bg-violet-500/20 data-[highlighted]:text-violet-200"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                功能组 (可多选)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => toggleFeature(feature.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                      selectedFeatures.includes(feature.id)
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white/2 border-white/5 text-zinc-500 hover:bg-white/5"
                    )}
                  >
                    <Icon
                      icon={feature.icon}
                      className={cn(
                        "w-5 h-5",
                        selectedFeatures.includes(feature.id)
                          ? "text-emerald-500"
                          : "text-zinc-700"
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold">{feature.name}</div>
                      <div className="text-[8px] opacity-50">
                        {feature.cost} 积分/张
                      </div>
                    </div>
                    {selectedFeatures.includes(feature.id) && (
                      <Icon
                        icon="lucide:check-circle-2"
                        className="w-4 h-4 text-emerald-500"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                上传原始素材 (Batch)
              </Label>
              <div
                className="aspect-video rounded-4xl border-2 border-dashed border-white/5 bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                onClick={() =>
                  document.getElementById("batch-input")?.click()
                }
              >
                <Icon
                  icon="lucide:upload-cloud"
                  className="w-10 h-10 text-white/20 group-hover:text-white/40 mb-3"
                />
                <span className="text-xs text-white/40 font-bold">
                  点击上传或拖拽图片 (最多 100 张)
                </span>
                <input
                  id="batch-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  aria-label="上传原始素材，最多 100 张"
                />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">待处理项目</span>
                <span className="font-bold">{files.length || 1} 张</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">单张费用</span>
                <span className="font-bold">
                  {totalCost / (files.length || 1)} 积分
                </span>
              </div>
              <div className="pt-4 border-t border-emerald-500/10 flex justify-between items-center">
                <span className="text-sm font-bold">预计消耗总积分</span>
                <span className="text-xl font-black text-emerald-500">
                  {totalCost}
                </span>
              </div>
            </div>

            {files.length > 0 && !prompt.trim() && (
              <p className="text-xs text-amber-400/90">
                请在上方填写「描述 / 提示词」后即可开始批量精修
              </p>
            )}
            <Button
              onClick={startBatchProcess}
              disabled={!canSubmit}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                canSubmit
                  ? "bg-white text-black hover:scale-[1.02] hover:bg-white/95 shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Icon
                    icon="lucide:loader-2"
                    className="w-5 h-5 animate-spin mr-2"
                  />
                  正在生成…
                </>
              ) : !prompt.trim() ? (
                "请先填写描述"
              ) : (credits?.credit_balance ?? 0) < totalCost ? (
                "积分不足"
              ) : (
                "开始批量精修"
              )}
            </Button>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="p-8 rounded-[3rem] bg-zinc-950/50 border border-white/5 min-h-[600px] flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
                  处理队列进度
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-600 font-bold">
                    SUCCESS: {resultUrls.filter(Boolean).length}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-bold">
                    REMAINING: {(files.length || 1) - resultUrls.length}
                  </span>
                  {canDownload && (
                    <>
                      <Button
                        onClick={handleDownloadAll}
                        size="sm"
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shrink-0"
                      >
                        <Icon icon="lucide:download" className="w-4 h-4 mr-1.5" />
                        打包下载
                      </Button>
                      <Button
                        onClick={handleSaveToWorks}
                        disabled={!user || isSavingToWorks}
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-white/20 text-white hover:bg-white/10 font-bold text-xs uppercase tracking-wider shrink-0"
                      >
                        {isSavingToWorks ? (
                          <Icon icon="lucide:loader-2" className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Icon icon="lucide:bookmark-plus" className="w-4 h-4 mr-1.5" />
                        )}
                        保存到我的作品
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {(() => {
                const count = files.length || 1;
                const list =
                  files.length > 0
                    ? files
                    : resultUrls.length > 0
                      ? resultUrls
                      : isProcessing
                        ? (Array(count).fill(null) as (string | null)[])
                        : [];
                if (list.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-20">
                      <Icon icon="lucide:images" className="w-16 h-16" />
                      <p className="text-sm font-medium">暂无待处理素材</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {list.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden relative group"
                      >
                        {item && (
                          <Image
                            src={item}
                            fill
                            unoptimized
                            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            alt=""
                          />
                        )}
                        {isProcessing && i >= resultUrls.length && (
                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                            <Icon
                              icon="lucide:loader-2"
                              className="w-6 h-6 animate-spin text-emerald-500"
                            />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
