"use client";

import React, { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { OculusVariant, OculusModule, ArkImageGenOptions } from "./types";

import { PromptTemplateManager, PromptTemplate } from "./PromptTemplateManager";

interface PreviewPanelProps {
  isGenerating: boolean;
  data: {
    variants: OculusVariant[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input?: any;
  } | null;
  onStop?: () => void;
  productImages: (string | File)[];
  onUpdateVariant?: (variant: OculusVariant) => void;
  fourViewImage?: string | null;
  useFourViewRef?: boolean;
  arkOptions?: ArkImageGenOptions;
}

export function PreviewPanel({
  isGenerating,
  data,
  onStop,
  productImages,
  onUpdateVariant,
  fourViewImage,
  useFourViewRef,
  arkOptions,
}: PreviewPanelProps) {



  const [activeTemplateTarget, setActiveTemplateTarget] = useState<{
    vIndex: number;
    mIndex: number;
    currentPrompt: string;
    moduleType: string;
  } | null>(null);

  const handleApplyTemplate = (template: PromptTemplate) => {
    if (!activeTemplateTarget || !data || !onUpdateVariant) return;
    const { vIndex, mIndex } = activeTemplateTarget;
    const variant = data.variants[vIndex];
    if (!variant) return;

    const updatedModules = [...variant.modules];
    updatedModules[mIndex] = {
      ...updatedModules[mIndex],
      image_prompt: template.prompt,
      mj_prompt: template.prompt, // Sync both
    };

    onUpdateVariant({
      ...variant,
      modules: updatedModules,
    });
    setActiveTemplateTarget(null);
  };

  if (isGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-8 p-10 bg-black/20 backdrop-blur-3xl rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full animate-pulse" />

        <div className="relative h-24 w-24">
          <motion.div
            className="absolute inset-0 rounded-full border-t-2 border-b-2 border-blue-400"
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border-r-2 border-l-2 border-purple-400"
            animate={{ rotate: -360, scale: [1, 0.9, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon icon="lucide:sparkles" className="h-8 w-8 text-blue-300 animate-pulse drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]" />
          </div>
        </div>

        <div className="text-center space-y-3 relative z-10">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-300 via-white to-purple-300 animate-pulse">
            Oculus is analyzing...
          </h3>
          <div className="flex flex-col gap-1 text-xs text-zinc-400 font-mono tracking-wide">
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}>
              [SCANNING_PRODUCT_DATA]
            </motion.span>
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}>
              [GENERATING_VISUAL_STRATEGY]
            </motion.span>
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}>
              [MATCHING_MARKETING_COPY]
            </motion.span>
          </div>
        </div>

        {onStop && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={onStop}
            className="relative flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-6 py-2.5 text-sm font-medium text-red-300 backdrop-blur-sm transition-all hover:bg-red-900/50 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
            <motion.div
              className="h-2.5 w-2.5 rounded-sm bg-red-400"
              animate={{ scale: [1, 0.7, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            停止生成
          </motion.button>
        )}
      </div>
    );
  }

  if (!data || !data.variants || data.variants.length === 0) {
    const handleDownloadFourViewEmpty = (url: string, filename: string) => {
      if (url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(() => window.open(url, "_blank"));
    };
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/5 relative">
        {fourViewImage ? (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">四视图参考（已生成）</span>
              <button
                type="button"
                onClick={() => handleDownloadFourViewEmpty(fourViewImage, `four-view-${Date.now()}.png`)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon icon="lucide:download" className="h-3 w-3" />
                下载
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fourViewImage}
              alt="Four view"
              className="w-full max-h-48 object-contain rounded-lg border border-white/10"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center text-zinc-500 p-8 group">
          <div className="absolute inset-0 bg-transparent bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center transition-transform duration-500 group-hover:scale-105">
            <div className="mb-6 rounded-2xl bg-black/40 p-6 shadow-2xl border border-white/5 group-hover:border-blue-500/30 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all">
              <Icon icon="lucide:layout" className="h-16 w-16 text-zinc-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-zinc-300">Wait for Input</h3>
            <p className="max-w-xs text-center text-sm text-zinc-500">
              {fourViewImage
                ? "四视图已生成于上方，可下载。填写左侧信息后点击「生成详情页方案」。"
                : "Describe your product on the left to activate the Oculus Engine."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadFourView = (url: string, filename: string) => {
    if (url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(() => window.open(url, "_blank"));
  };

  return (
    <ScrollArea className="h-full rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="p-4 space-y-4">
        {fourViewImage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">四视图参考</span>
              <button
                type="button"
                onClick={() => handleDownloadFourView(fourViewImage, `four-view-${Date.now()}.png`)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon icon="lucide:download" className="h-3 w-3" />
                下载
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fourViewImage}
              alt="Four view"
              className="w-full max-h-32 object-contain rounded-lg border border-white/10"
            />
          </motion.div>
        )}
        <AnimatePresence>
          {data.variants.map((variant: OculusVariant, index: number) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              index={index}
              productImages={productImages}
              onOpenTemplateManager={(mIndex, currentPrompt, moduleType) =>
                setActiveTemplateTarget({
                  vIndex: index,
                  mIndex,
                  currentPrompt,
                  moduleType,
                })
              }
              fourViewImage={fourViewImage}
              useFourViewRef={useFourViewRef}
              arkOptions={arkOptions}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Template Manager Dialog (shadcn Dialog) */}
      <Dialog
        open={!!activeTemplateTarget}
        onOpenChange={(open) => !open && setActiveTemplateTarget(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] border-white/10 bg-zinc-900 p-0 gap-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">选择 Prompt 模板</DialogTitle>
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-white/5 shrink-0">
            <span className="text-sm font-medium text-white">选择 Prompt 模板</span>
          </div>
          <div className="p-4 overflow-auto min-h-0">
            {activeTemplateTarget && (
              <PromptTemplateManager
                onApply={handleApplyTemplate}
                filterModuleType={activeTemplateTarget.moduleType}
                className="h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

function VariantCard({
  variant,
  index,
  productImages,
  onOpenTemplateManager,
  fourViewImage,
  useFourViewRef,
  arkOptions,
}: {
  variant: OculusVariant;
  index: number;
  productImages: (string | File)[];
  onOpenTemplateManager?: (mIndex: number, currentPrompt: string, moduleType: string) => void;
  fourViewImage?: string | null;
  useFourViewRef?: boolean;
  arkOptions?: ArkImageGenOptions;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [imagesGenerating, setImagesGenerating] = useState(false);
  const [moduleImages, setModuleImages] = useState<Record<string, string | null>>({});

  // Helper to convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleApply = async () => {
    const allCopy = variant.modules
      .map((m) => `【${m.display_title}】\n${m.copy_overlay}`)
      .join("\n\n");
    const fullText = `=== ${variant.style_name} ===\n${variant.description || ""}\n\n${allCopy}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleGenerateImages = useCallback(async () => {
    setImagesGenerating(true);
    const results: Record<string, string | null> = {};
    // Read user's chosen image model from Settings (localStorage)
    const imageModel =
      localStorage.getItem("oculus_image_model") ||
      "doubao-seedream-4-5-251128";

    // Prepare reference images
    let refImages: string[] = [];
    if (useFourViewRef && fourViewImage) {
      refImages = [fourViewImage];
    } else if (productImages && productImages.length > 0) {
      // Convert all product images to base64 if they are files
      try {
        refImages = await Promise.all(
          productImages.map(async (img) => {
            if (typeof img === "string") return img;
            return await fileToBase64(img);
          })
        );
      } catch (e) {
        console.error("Error converting images to base64:", e);
      }
    }

    await Promise.allSettled(
      variant.modules.map(async (module, idx) => {
        const key = module.module_id ?? module.title ?? String(idx);
        const prompt = module.mj_prompt || module.image_prompt || "";
        if (!prompt) { results[key] = null; return; }
        try {
          const res = await fetch("/api/oculus/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              moduleType: module.module_type ?? module.module_id ?? "unknown",
              refImages: refImages,
              modelId: imageModel,
              imageOptions: arkOptions,
            }),
          });
          const data = await res.json();
          results[key] = data.image_url || null;
        } catch {
          results[key] = null;
        }
      })
    );

    setModuleImages(results);
    setImagesGenerating(false);
  }, [variant.modules, productImages, fourViewImage, useFourViewRef, arkOptions]);

  const styleColors = [
    { border: "border-blue-500/20", glow: "from-blue-600/8 to-transparent", dot: "bg-blue-400", badge: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
    { border: "border-purple-500/20", glow: "from-purple-600/8 to-transparent", dot: "bg-purple-400", badge: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
    { border: "border-emerald-500/20", glow: "from-emerald-600/8 to-transparent", dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  ];
  const style = styleColors[index % styleColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-zinc-900/50 transition-shadow duration-300",
        style.border
      )}
    >
      {/* Ambient gradient */}
      <div className={cn("absolute inset-0 bg-linear-to-br opacity-60 pointer-events-none", style.glow)} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={cn("h-2 w-2 rounded-full", style.dot)} />
          <div>
            <h4 className="text-sm font-semibold text-white leading-tight">{variant.style_name}</h4>
            {variant.description && (
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight max-w-[280px] truncate">{variant.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", style.badge)}>
            V.{index + 1}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateImages}
            disabled={imagesGenerating}
            className="h-7 rounded-full border border-white/10 bg-white/5 text-[11px] font-medium text-zinc-400 hover:bg-violet-500/80 hover:text-white hover:border-violet-400/50 transition-all disabled:opacity-40 px-3"
          >
            {imagesGenerating ? (
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:loader-2" className="h-3 w-3 animate-spin" />
                生成中…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:image-plus" className="h-3 w-3" />
                生成图片
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 rounded-full border border-white/10 bg-white/5 text-[11px] font-medium text-zinc-400 hover:bg-blue-500/80 hover:text-white hover:border-blue-400/50 transition-all px-3",
              copyState === "copied" && "bg-green-500/20 text-green-400 border-green-500/30",
              copyState === "error" && "bg-red-500/20 text-red-400 border-red-500/30"
            )}
            onClick={handleApply}
          >
            <AnimatePresence mode="wait">
              {copyState === "copied" ? (
                <motion.span key="copied" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Icon icon="lucide:check" className="h-3 w-3" />已复制
                </motion.span>
              ) : copyState === "error" ? (
                <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Icon icon="lucide:x" className="h-3 w-3" />失败
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Icon icon="lucide:clipboard-copy" className="h-3 w-3" />复制文案
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* Module list */}
      <div className="relative divide-y divide-white/4">
        {variant.modules.map((module: OculusModule, i: number) => (
          <ModuleRow
            key={i}
            module={module}
            imageUrl={moduleImages[module.module_id ?? module.title ?? String(i)]}
            isGeneratingImage={imagesGenerating}
            onOpenTemplateManager={() =>
              onOpenTemplateManager?.(
                i,
                module.image_prompt || module.mj_prompt || "",
                module.module_type || "hero_section"
              )
            }
          />
        ))}
      </div>
    </motion.div>
  );
}

function ModuleRow({
  module,
  imageUrl,
  isGeneratingImage,
  onOpenTemplateManager,
}: {
  module: OculusModule;
  imageUrl?: string | null;
  isGeneratingImage?: boolean;
  onOpenTemplateManager?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<"copy" | "prompt" | null>(null);

  const isFrontendModule = ["specs", "footer"].includes(module.module_type || module.module_id || "");

  const copyToClipboard = async (text: string, field: "copy" | "prompt") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { /* silent */ }
  };

  const moduleTypeIcons: Record<string, string> = {
    hero_section: "lucide:layout-template",
    pain_points: "lucide:zap",
    solution: "lucide:lightbulb",
    ingredients: "lucide:flask-conical",
    mechanism: "lucide:atom",
    craftsmanship: "lucide:gem",
    specs: "lucide:table-2",
    footer: "lucide:shield-check",
  };
  const icon = moduleTypeIcons[module.module_type || module.module_id || ""] || "lucide:square";

  return (
    <div className="group/row">
      {/* Row header — always visible, click to expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors text-left"
      >
        {/* Module icon */}
        <div className="shrink-0 h-7 w-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center">
          <Icon icon={icon} className="h-3.5 w-3.5 text-zinc-400" />
        </div>

        {/* Title + type badge */}
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-zinc-200 leading-tight">
            {module.display_title || module.title}
          </span>
        </div>

        {/* Image thumbnail (if generated) */}
        {!isFrontendModule && imageUrl && (
          <div className="shrink-0 h-8 w-12 rounded overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* Generating spinner */}
        {!isFrontendModule && isGeneratingImage && !imageUrl && (
          <div className="shrink-0 h-8 w-12 rounded bg-white/5 border border-white/8 flex items-center justify-center animate-pulse">
            <Icon icon="lucide:image" className="h-3 w-3 text-zinc-600" />
          </div>
        )}

        {/* Frontend badge */}
        {isFrontendModule && (
          <span className="shrink-0 text-[9px] font-mono text-amber-500/70 border border-amber-500/20 rounded px-1.5 py-0.5">
            前端渲染
          </span>
        )}

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-zinc-600 group-hover/row:text-zinc-400 transition-colors"
        >
          <Icon icon="lucide:chevron-down" className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 space-y-2.5">
              {/* Full image (if generated) */}
              {!isFrontendModule && imageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="overflow-hidden rounded-xl border border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={module.display_title || module.title}
                    className="w-full object-cover max-h-52"
                  />
                </motion.div>
              )}

              {/* Copywriting */}
              <button
                onClick={() => copyToClipboard(module.copy_overlay || module.copy_content || "", "copy")}
                className="w-full text-left rounded-xl border border-white/5 bg-black/20 px-4 py-3 hover:bg-black/30 hover:border-blue-500/20 transition-all group/copy"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon icon="lucide:message-square-quote" className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-wider">Copywriting</span>
                  </div>
                  <Icon
                    icon={copiedField === "copy" ? "lucide:check" : "lucide:copy"}
                    className={cn(
                      "h-3 w-3 transition-all",
                      copiedField === "copy" ? "text-green-400 opacity-100" : "text-zinc-600 opacity-0 group-hover/copy:opacity-100"
                    )}
                  />
                </div>
                <p className="text-[12px] leading-relaxed text-zinc-300 whitespace-pre-line">
                  {module.copy_overlay || module.copy_content}
                </p>
              </button>

              {/* Visual Prompt */}
              <div className="relative group/prompt">
                <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 group-hover/prompt:opacity-100 transition-opacity z-10">
                  <button
                    onClick={onOpenTemplateManager}
                    className="flex items-center gap-1 rounded-md bg-violet-600/90 px-2 py-1 text-[10px] font-medium text-white shadow-sm hover:bg-violet-500 backdrop-blur-sm"
                  >
                    <Icon icon="lucide:layout-template" className="h-3 w-3" />
                    模板
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(module.mj_prompt || module.image_prompt || "", "prompt")}
                    className="rounded-md bg-white/10 p-1 text-zinc-300 hover:bg-white/20 hover:text-white backdrop-blur-sm"
                    aria-label="复制提示词"
                  >
                    <Icon
                      icon={copiedField === "prompt" ? "lucide:check" : "lucide:copy"}
                      className={cn("h-3.5 w-3.5", copiedField === "prompt" && "text-green-400")}
                    />
                  </button>
                </div>
                <div
                  className="w-full text-left rounded-xl border border-white/5 bg-black/20 px-4 py-3 hover:bg-black/30 hover:border-purple-500/20 transition-all cursor-text"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon icon="lucide:image" className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-400/70 uppercase tracking-wider">Visual Prompt</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500 font-mono line-clamp-3">
                    {module.mj_prompt || module.image_prompt || <span className="text-zinc-700 italic">No prompt generated</span>}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PreviewPanel;
