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
import { UploadedImageList } from "@/components/agency/UploadedImageList";
import { SCHEME_TYPES, getSchemeById } from "@/lib/setgen-schemes";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS: Step[] = [
  { id: "upload", label: "上传图片", subLabel: "产品图与细节图" },
  { id: "analyze", label: "AI 分析", subLabel: "方案类型与参数" },
  { id: "generate", label: "生成中", subLabel: "按方案类型出图" },
  { id: "complete", label: "完成", subLabel: "打包下载或保存" },
];

const BACKGROUND_OPTIONS = [
  { value: "original", label: "原图背景" },
  { value: "white", label: "白底图" },
] as const;

const IMAGE_MODEL_KEY = "oculus_image_model";
const DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-lite";
const COST_PER_IMAGE = 10;

export default function SetGenerationPage() {
  const { user, credits } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [background, setBackground] = useState<"white" | "original">("original");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [clarity, setClarity] = useState("2K");
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>(["white-retouch"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrls, setResultUrls] = useState<(string | null)[]>([]);
  const [isSavingToWorks, setIsSavingToWorks] = useState(false);

  const totalCost = selectedSchemes.length * COST_PER_IMAGE;

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

  const removeUploadedImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleScheme = (id: string) => {
    setSelectedSchemes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const startGeneration = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error("请填写需求描述，越详细越容易出好图");
      return;
    }
    if (selectedSchemes.length === 0) {
      toast.error("请至少选择一种方案类型");
      return;
    }
    if (credits && credits.credit_balance < totalCost) {
      toast.error("积分余额不足，请充值后继续");
      return;
    }

    const basePrompt =
      background === "white"
        ? `${trimmedPrompt}，纯白背景`
        : trimmedPrompt;
    const size = getSizeFromOptions(clarity, aspectRatio);
    const modelId =
      typeof window !== "undefined"
        ? localStorage.getItem(IMAGE_MODEL_KEY) || DEFAULT_IMAGE_MODEL
        : DEFAULT_IMAGE_MODEL;
    const refs = files.length > 0 ? files : [];

    setIsGenerating(true);
    setCurrentStep(1);
    setResultUrls(selectedSchemes.map(() => null));

    let successCount = 0;
    for (let i = 0; i < selectedSchemes.length; i++) {
      if (i > 0 && i % 2 === 0) setCurrentStep(2);
      const schemeId = selectedSchemes[i];
      const scheme = getSchemeById(schemeId);
      const promptAppendix = scheme
        ? `${scheme.promptInstruction ?? scheme.suffix}`
        : "";
      const finalPrompt = basePrompt + promptAppendix;
      try {
        const body = {
          prompt: finalPrompt,
          moduleType: "setgen",
          modelId,
          refImages: refs.length > 0 ? [refs[0]] : undefined,
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
        const url = !res.ok ? null : data.image_url ?? null;
        if (!res.ok) {
          toast.error(data.error || `方案「${scheme?.title ?? schemeId}」生成失败`);
        } else if (url) {
          successCount++;
        }
        setResultUrls((prev) => {
          const next = [...prev];
          next[i] = url;
          return next;
        });
      } catch (e) {
        console.error("[SetGen] 请求异常:", e);
        toast.error(`方案「${scheme?.title ?? schemeId}」请求失败`);
        setResultUrls((prev) => {
          const next = [...prev];
          next[i] = null;
          return next;
        });
      }
    }

    setCurrentStep(3);
    setIsGenerating(false);
    if (successCount > 0) {
      toast.success(`组图完成！成功 ${successCount}/${selectedSchemes.length} 张，已消耗 ${totalCost} 积分`);
    }
  };

  const canSubmit =
    prompt.trim().length > 0 &&
    selectedSchemes.length > 0 &&
    !isGenerating &&
    (credits?.credit_balance ?? 0) >= totalCost;

  const successResults = resultUrls.filter((u): u is string => Boolean(u));
  const canDownload = successResults.length > 0 && !isGenerating;

  const handleDownloadAll = async () => {
    if (successResults.length === 0) return;
    toast.info(`正在准备下载 ${successResults.length} 张图片…`);
    for (let i = 0; i < successResults.length; i++) {
      const url = successResults[i];
      const name = `setgen-${i + 1}.png`;
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
        const body = urlOrData.startsWith("data:")
          ? { data_url: urlOrData, type: "image" as const, source: "setgen" }
          : { url: urlOrData, type: "image" as const, source: "setgen" };
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
    if (saved > 0) toast.success(`已保存 ${saved} 张到我的作品`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-2">
            AI Set <span className="font-semibold italic font-serif">Generator</span>
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide">
            智能组图：从 0 到 1 自动构建整套商业视觉方案
          </p>
        </header>

        <WorkflowStepper steps={STEPS} currentStepIndex={currentStep} className="mb-20" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                需求描述
              </Label>
              <FieldWithAIFill
                value={prompt}
                onChange={setPrompt}
                variant="textarea"
                placeholder="建议输入：款式品类、题材材质、设计元素、适合人群、风格调性等…越详细越容易出好图；或上传图片后点击「AI 填充」自动生成"
                disabledWhen={files.length === 0}
                disabledHint="请先上传至少一张产品图或参考图"
                inputClassName="min-h-[100px] rounded-xl border-white/10 bg-zinc-900/80 text-white placeholder:text-zinc-500 focus-visible:ring-violet-500/50 resize-y"
                onFill={async () => {
                  const res = await fetch("/api/setgen/describe-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ images: files }),
                  });
                  const data = (await res.json()) as { description?: string; error?: string };
                  if (!res.ok) {
                    toast.error(data.error || "生成描述失败");
                    return "";
                  }
                  const desc = data.description ?? "";
                  if (desc) toast.success("已根据图片生成描述，可再次点击以刷新不同表述");
                  return desc;
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">背景设置</Label>
              <Select value={background} onValueChange={(v) => setBackground(v as "white" | "original")}>
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">比例</Label>
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">清晰度</Label>
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

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">模型</Label>
              <div className="rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-3 text-sm text-zinc-400">
                Doubao Seedream 5.0 Lite
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                产品图 / 参考图
              </Label>
              <div
                className="aspect-video rounded-3xl border-2 border-dashed border-white/5 bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                onClick={() => document.getElementById("setgen-input")?.click()}
              >
                <Icon icon="lucide:upload-cloud" className="w-10 h-10 text-white/20 group-hover:text-white/40 mb-3" />
                <span className="text-xs text-white/40 font-bold">点击上传或拖拽图片 (最多 100 张)</span>
                <input
                  id="setgen-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  aria-label="上传产品图或参考图"
                />
              </div>
              {files.length > 0 && (
                <UploadedImageList
                  images={files}
                  onRemove={removeUploadedImage}
                  maxDisplay={24}
                  className="mt-2"
                />
              )}
            </div>

            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">选中方案类型</span>
                <span className="font-bold">{selectedSchemes.length} 种</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">单张费用</span>
                <span className="font-bold">{COST_PER_IMAGE} 积分</span>
              </div>
              <div className="pt-4 border-t border-emerald-500/10 flex justify-between items-center">
                <span className="text-sm font-bold">预计消耗总积分</span>
                <span className="text-xl font-black text-emerald-500">{totalCost}</span>
              </div>
            </div>

            <Button
              onClick={startGeneration}
              disabled={!canSubmit}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                canSubmit
                  ? "bg-white text-black hover:scale-[1.02] hover:bg-white/95 shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin mr-2" />
                  正在生成…
                </>
              ) : !prompt.trim() ? (
                "请先填写需求描述"
              ) : selectedSchemes.length === 0 ? (
                "请至少选择一种方案类型"
              ) : (credits?.credit_balance ?? 0) < totalCost ? (
                "积分不足"
              ) : (
                `分析并生成方案 (-${totalCost} 积分)`
              )}
            </Button>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                方案基础类型 (多选)
              </Label>
              <span className="text-[10px] text-white/40 font-bold">已选 {selectedSchemes.length} 项</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {SCHEME_TYPES.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => toggleScheme(scheme.id)}
                  className={cn(
                    "p-5 rounded-3xl border transition-all text-left group",
                    selectedSchemes.includes(scheme.id)
                      ? "bg-emerald-500/5 border-emerald-500/30 text-white ring-1 ring-emerald-500/20"
                      : "bg-white/2 border-white/5 text-zinc-500 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform">
                      <Icon icon={scheme.icon} className="w-5 h-5 text-white/60" />
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border border-white/20 flex items-center justify-center",
                        selectedSchemes.includes(scheme.id) && "bg-emerald-500 border-emerald-500"
                      )}
                    >
                      {selectedSchemes.includes(scheme.id) && <Icon icon="lucide:check" className="w-3 h-3 text-black" />}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold mb-1">{scheme.title}</h4>
                  <p className="text-[10px] text-zinc-500 tracking-wide leading-relaxed">{scheme.desc}</p>
                </button>
              ))}
            </div>

            <div className="p-8 rounded-[3rem] bg-zinc-950/50 border border-white/5 min-h-[400px] flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">处理队列进度</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-600 font-bold">SUCCESS: {resultUrls.filter(Boolean).length}</span>
                  <span className="text-[10px] text-zinc-600 font-bold">
                    REMAINING: {selectedSchemes.length - resultUrls.length}
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

              {resultUrls.length === 0 && !isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-20">
                  <Icon icon="lucide:package-open" className="w-16 h-16" />
                  <p className="text-sm font-medium">生成结果将在此展示</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {resultUrls.map((url, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden relative group"
                    >
                      {url ? (
                        <Image
                          src={url}
                          fill
                          unoptimized
                          className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          alt=""
                        />
                      ) : (
                        <>
                          <Skeleton className="absolute inset-0 rounded-none bg-white/10" />
                          {!isGenerating && (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
                              生成失败
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
