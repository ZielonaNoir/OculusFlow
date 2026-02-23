"use client";

import React, { useState, useCallback } from "react";
import { type SupplementResponse } from "@/types/supplement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

interface OutputPanelProps {
  data: SupplementResponse;
  onReset?: () => void;
  productContext?: {
    productName: string;
    coreIngredients: string;
    imagePreviews: string[];
    fourViewImages?: string[];
  };
}

type ImageState = {
  loading: boolean;
  url: string | null;
  error: string | null;
};

const IMAGE_MODEL_KEY = "oculus_image_model";
const DEFAULT_IMAGE_MODEL = "doubao-seedream-4-5-251128";
const IMAGE_CACHE_KEY = "supplement_agent_images";

/** Strip terms that trigger 即梦/Seedream sensitive-content filter */
function sanitizePrompt(text: string): string {
  return text
    .replace(/医疗/g, "健康科技")
    .replace(/医学/g, "健康科学")
    .replace(/医生/g, "健康顾问")
    .replace(/医院/g, "健康中心")
    .replace(/疾病/g, "亚健康")
    .replace(/病情/g, "健康状态")
    .replace(/治疗/g, "改善")
    .replace(/病人/g, "用户")
    .replace(/(生殅|GMP|认证)/g, (m) => m); // keep these
}

async function generateMainImage(
  prompt: string,
  refImages: string[] | undefined
): Promise<string> {
  const modelId =
    typeof window !== "undefined"
      ? (localStorage.getItem(IMAGE_MODEL_KEY) ?? DEFAULT_IMAGE_MODEL)
      : DEFAULT_IMAGE_MODEL;

  const res = await fetch("/api/oculus/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      moduleType: "hero_section",
      modelId,
      ...(refImages ? { refImages } : {}),
      imageOptions: {
        size: "2048x2048",
        watermark: false,
        optimizePromptMode: "standard",
      },
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { image_url: string | null; status: string };
  if (!json.image_url) throw new Error("No image returned by model");
  return json.image_url;
}

export function SupplementOutputPanel({ data, onReset, productContext }: OutputPanelProps) {
  const [imageStates, setImageStates] = useState<Record<number, ImageState>>(() => {
    try {
      const cached = localStorage.getItem(IMAGE_CACHE_KEY);
      if (cached) return JSON.parse(cached) as Record<number, ImageState>;
    } catch { /* ignore */ }
    return {};
  });
  const [debugOpen, setDebugOpen] = useState<Record<number, boolean>>({});
  const [payloadOverrides, setPayloadOverrides] = useState<Record<number, { prompt?: string; disabledRefs?: string[] }>>({});

  const handleGenImage = useCallback(
    async (idx: number, finalPrompt: string, finalRefs: string[] | undefined) => {
      setImageStates(prev => ({ ...prev, [idx]: { loading: true, url: null, error: null } }));
      try {
        const url = await generateMainImage(finalPrompt, finalRefs);
        setImageStates(prev => {
          const next = { ...prev, [idx]: { loading: false, url, error: null } };
          try { localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
      } catch (e) {
        setImageStates(prev => ({
          ...prev,
          [idx]: { loading: false, url: null, error: e instanceof Error ? e.message : "生成失败" },
        }));
      }
    },
    []
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 rounded-2xl p-6 overflow-hidden">
      <div className="mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon icon="lucide:file-check" className="text-teal-400" />
            保健品全案策划报告
          </h2>
          <p className="text-xs text-zinc-400 mt-1">4-Agent Compliance-First Pipeline</p>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"
          >
            <Icon icon="lucide:refresh-cw" className="h-3.5 w-3.5" />
            重新生成
          </button>
        )}
      </div>

      <Tabs defaultValue="efficacy" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-white/5 border border-white/10 w-full justify-start rounded-xl p-1 shrink-0 flex-wrap h-auto">
          <TabsTrigger value="efficacy" className="rounded-lg text-zinc-400 hover:text-zinc-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
            <Icon icon="lucide:leaf" className="mr-2 h-4 w-4" /> 功效买点
          </TabsTrigger>
          <TabsTrigger value="longpage" className="rounded-lg text-zinc-400 hover:text-zinc-200 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Icon icon="lucide:layout" className="mr-2 h-4 w-4" /> 详情页结构
          </TabsTrigger>
          <TabsTrigger value="visual" className="rounded-lg text-zinc-400 hover:text-zinc-200 data-[state=active]:bg-sky-600 data-[state=active]:text-white">
            <Icon icon="lucide:image" className="mr-2 h-4 w-4" /> 主图视觉
          </TabsTrigger>
          <TabsTrigger value="ops" className="rounded-lg text-zinc-400 hover:text-zinc-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Icon icon="lucide:message-square" className="mr-2 h-4 w-4" /> 评价与客服
          </TabsTrigger>
          <TabsTrigger value="compliance" className="rounded-lg text-zinc-400 hover:text-zinc-200 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Icon icon="lucide:shield-alert" className="mr-2 h-4 w-4" /> 合规审核
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-2">

          {/* TAB 1: Efficacy claims */}
          <TabsContent value="efficacy" className="m-0 space-y-6 animate-in fade-in duration-500">
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">核心功效买点 (成分→人话翻译)</h3>
              <div className="grid gap-4">
                {data.efficacyClaims.map((claim, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    key={idx}
                    className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 hover:border-teal-500/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white leading-tight">{claim.title}</h4>
                        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{claim.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">细分使用场景</h3>
              <div className="flex flex-wrap gap-2">
                {data.scenarios.map((scene, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
                    <Icon icon="lucide:heart-pulse" className="inline mr-1 text-teal-500/70" /> {scene}
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: 详情页长图结构 */}
          <TabsContent value="longpage" className="m-0 animate-in fade-in duration-500">
            <h3 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">详情页长图板块结构</h3>
            <div className="relative border-l-2 border-emerald-500/30 ml-3 space-y-0 pb-4">
              {data.longPageStructure.map((sec, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="relative pl-6 pb-6"
                >
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5 ring-4 ring-zinc-950" />
                  <div className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-emerald-500/30 transition-colors">
                    <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <Icon icon="lucide:layout-panel-top" className="h-4 w-4 shrink-0" />
                      {String(idx + 1).padStart(2, "0")}. {sec.section}
                    </h4>
                    <p className="text-sm text-zinc-300 leading-relaxed">{sec.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: Visual — with image generation + payload inspector */}
          <TabsContent value="visual" className="m-0 space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Icon icon="lucide:info" className="h-3.5 w-3.5 shrink-0" />
                点击「即梦出图」生成单张图 · 或一键生成本组全部 10 张大片
              </p>
              <button
                type="button"
                onClick={() => {
                  data.mainImages.forEach((img, idx) => {
                    if (!imageStates[idx]?.loading && !imageStates[idx]?.url) {
                      const override = payloadOverrides[idx] || {};
                      
                      // Compute the prompt
                      const productHint = productContext
                        ? `【核心产品信息】：名称:${productContext.productName}。核心卖点/成分规格:${productContext.coreIngredients.slice(0, 150)}。`
                        : "";
                      const rawPrompt = `【风格限制】：电商高级视觉，产品广告大片质感，超高分辨率，8k画质，逼真材质（Realistic Textures），极其精细的商业布光（Studio Lighting, Cinematic Raycasting），画面干净极简，无多余杂物，无任何平台水印，不出现无关人体手部。\n\n${productHint}\n\n【主体画面】：${img.concept}\n【设计细节与构图要求】：${img.suggestion}。`;
                      const defaultPrompt = sanitizePrompt(rawPrompt);
                      const currentPrompt = override.prompt ?? defaultPrompt;

                      // Compute active references
                      const productRefImages = productContext?.imagePreviews ?? [];
                      const fourViewRefImages = productContext?.fourViewImages ?? [];
                      const allPossibleRefs = [...productRefImages, ...fourViewRefImages].slice(0, 3);
                      const disabledRefs = override.disabledRefs ?? [];
                      const activeRefs = allPossibleRefs.filter(url => !disabledRefs.includes(url));
                      const finalRefsToSubmit = activeRefs.length > 0 ? activeRefs : undefined;

                      handleGenImage(idx, currentPrompt, finalRefsToSubmit);
                    }
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-teal-400 hover:bg-zinc-700 hover:text-teal-300 rounded-lg text-sm font-medium transition-colors border border-teal-500/20 shadow-sm"
              >
                <Icon icon="lucide:images" className="h-4 w-4" />
                一键出 {data.mainImages.length} 图
              </button>
            </div>
            <div className="space-y-4">
              {data.mainImages.map((img, idx) => {
                const imgState = imageStates[idx];
                const isDebugOpen = debugOpen[idx] ?? false;

                // Build the payload preview (defaults vs overrides)
                const override = payloadOverrides[idx] || {};
                const modelId =
                  typeof window !== "undefined"
                    ? (localStorage.getItem(IMAGE_MODEL_KEY) ?? DEFAULT_IMAGE_MODEL)
                    : DEFAULT_IMAGE_MODEL;
                
                const productHint = productContext
                  ? `【核心产品信息】：名称:${productContext.productName}。核心卖点/成分规格:${productContext.coreIngredients.slice(0, 150)}。`
                  : "";
                
                // Generalized High-end Prompt String
                const rawPrompt = `【风格限制】：电商高级视觉，产品广告大片质感，超高分辨率，8k画质，逼真材质（Realistic Textures），极其精细的商业布光（Studio Lighting, Cinematic Raycasting），画面干净极简，无多余杂物，无任何平台水印，不出现无关人体手部。\n\n${productHint}\n\n【主体画面】：${img.concept}\n【设计细节与构图要求】：${img.suggestion}。`;
                
                const defaultPrompt = sanitizePrompt(rawPrompt);
                const currentPrompt = override.prompt ?? defaultPrompt;

                const productRefImages = productContext?.imagePreviews ?? [];
                const fourViewRefImages = productContext?.fourViewImages ?? [];
                const allPossibleRefs = [...productRefImages, ...fourViewRefImages].slice(0, 3);
                const disabledRefs = override.disabledRefs ?? [];
                const activeRefs = allPossibleRefs.filter(url => !disabledRefs.includes(url));
                const finalRefsToSubmit = activeRefs.length > 0 ? activeRefs : undefined;

                return (
                  <motion.div
                    key={img.index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="rounded-xl border border-white/8 bg-white/3 overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-mono text-lg text-sky-400 shrink-0">
                        {img.index}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest block">{img.concept}</span>
                        <p className="text-sm text-zinc-300 mt-0.5">{img.suggestion}</p>
                      </div>
                      {/* Debug toggle */}
                      <button
                        type="button"
                        onClick={() => setDebugOpen(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        title="自定义出图参数"
                        className={`shrink-0 p-2 rounded-lg border transition-all ${
                          isDebugOpen
                            ? "border-violet-500/50 bg-violet-500/15 text-violet-400"
                            : "border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                        }`}
                      >
                        <Icon icon={isDebugOpen ? "lucide:settings-2" : "lucide:settings"} className="h-3.5 w-3.5" />
                      </button>
                      {/* Generate button */}
                      <button
                        onClick={() => handleGenImage(idx, currentPrompt, finalRefsToSubmit)}
                        disabled={imgState?.loading}
                        className={`flex items-center gap-1.5 shrink-0 text-xs px-3 py-2 rounded-lg font-medium transition-all border ${
                          imgState?.loading
                            ? "border-sky-500/20 bg-sky-500/10 text-sky-400 cursor-not-allowed"
                            : imgState?.url
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:border-sky-500/50"
                        }`}
                      >
                        {imgState?.loading ? (
                          <><Icon icon="lucide:loader-2" className="h-3.5 w-3.5 animate-spin" /> 生成中...</>
                        ) : imgState?.url ? (
                          <><Icon icon="lucide:check-circle-2" className="h-3.5 w-3.5" /> 重新出图</>
                        ) : (
                          <><Icon icon="lucide:wand-2" className="h-3.5 w-3.5" /> 即梦出图</>
                        )}
                      </button>
                    </div>

                    {/* Payload Inspector Panel */}
                    <AnimatePresence>
                      {isDebugOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden border-t border-violet-500/20 bg-violet-500/5"
                        >
                          <div className="p-4 space-y-3">
                            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center justify-between">
                              <span className="flex items-center gap-1.5"><Icon icon="lucide:sliders-horizontal" className="h-3 w-3" /> 自定义出图参数</span>
                              {(override.prompt || override.disabledRefs?.length) && (
                                <button 
                                  onClick={() => setPayloadOverrides(prev => { const next={...prev}; delete next[idx]; return next; })}
                                  className="text-violet-400/70 hover:text-violet-400 underline decoration-violet-500/30 underline-offset-2"
                                >
                                  重置默认
                                </button>
                              )}
                            </p>

                            {/* Model + Params row */}
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 rounded-md bg-black/30 border border-white/8 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
                                <Icon icon="lucide:cpu" className="h-3 w-3 text-violet-400" />
                                {modelId}
                              </span>
                              <span className="px-2 py-1 rounded-md bg-black/30 border border-white/8 text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                                <Icon icon="lucide:image" className="h-3 w-3 text-zinc-500" />
                                2048×2048
                              </span>
                              <span className={`px-2 py-1 rounded-md border text-[11px] font-mono flex items-center gap-1.5 ${
                                activeRefs.length > 0
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-white/5 border-white/8 text-zinc-500"
                              }`}>
                                <Icon icon={activeRefs.length > 0 ? "lucide:check-circle-2" : "lucide:x-circle"} className="h-3 w-3" />
                                {activeRefs.length > 0 ? `img2img · ${activeRefs.length}张参考图` : "t2i · 无参考图"}
                              </span>
                            </div>

                            {/* Prompt text */}
                            <div className="rounded-lg bg-black/40 border-2 border-transparent focus-within:border-violet-500/30 transition-colors p-3">
                              <p className="text-[10px] text-violet-400 font-semibold mb-1.5 uppercase tracking-wider flex items-center justify-between">
                                Prompt
                                <Icon icon="lucide:pencil" className="h-3 w-3 opacity-50" />
                              </p>
                              <textarea 
                                value={currentPrompt}
                                onChange={e => setPayloadOverrides(prev => ({ ...prev, [idx]: { ...prev[idx], prompt: e.target.value } }))}
                                className="w-full text-[11px] text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap break-words bg-transparent border-none p-0 focus:ring-0 resize-none min-h-[60px]"
                                rows={4}
                              />
                            </div>

                            {/* Reference images */}
                            {(productRefImages.length > 0 || fourViewRefImages.length > 0) && (
                              <div>
                                <p className="text-[10px] text-violet-400 font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">
                                  参考图 (点击可启用/禁用)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {productRefImages.slice(0, 3).map((src, i) => {
                                    const isDisabled = disabledRefs.includes(src);
                                    return (
                                      <div key={`prod-${i}`} 
                                           className={`relative cursor-pointer transition-all ${isDisabled ? "opacity-30 grayscale hover:opacity-60" : "hover:ring-2 ring-violet-500/50 rounded-lg"}`}
                                           onClick={() => setPayloadOverrides(prev => {
                                              const oldDisabled = prev[idx]?.disabledRefs || [];
                                              const newDisabled = isDisabled ? oldDisabled.filter(r => r !== src) : [...oldDisabled, src];
                                              return { ...prev, [idx]: { ...prev[idx], disabledRefs: newDisabled } };
                                           })}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={src} alt="产品图" className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                                        {!isDisabled && <span className="absolute -bottom-1 -right-1 bg-teal-500 text-[8px] text-white px-1 rounded-sm font-bold shadow-sm">产品</span>}
                                        {isDisabled && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><Icon icon="lucide:x" className="text-white h-5 w-5" /></div>}
                                      </div>
                                    );
                                  })}
                                  {fourViewRefImages.slice(0, Math.max(0, 3 - productRefImages.length)).map((src, i) => {
                                    const isDisabled = disabledRefs.includes(src);
                                    return (
                                      <div key={`fv-${i}`} 
                                           className={`relative cursor-pointer transition-all ${isDisabled ? "opacity-30 grayscale hover:opacity-60" : "hover:ring-2 ring-violet-500/50 rounded-lg"}`}
                                           onClick={() => setPayloadOverrides(prev => {
                                              const oldDisabled = prev[idx]?.disabledRefs || [];
                                              const newDisabled = isDisabled ? oldDisabled.filter(r => r !== src) : [...oldDisabled, src];
                                              return { ...prev, [idx]: { ...prev[idx], disabledRefs: newDisabled } };
                                           })}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={src} alt="四视图" className="w-14 h-14 rounded-lg object-cover border border-violet-500/30" />
                                        {!isDisabled && <span className="absolute -bottom-1 -right-1 bg-violet-500 text-[8px] text-white px-1 rounded-sm font-bold shadow-sm">四视</span>}
                                        {isDisabled && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><Icon icon="lucide:x" className="text-white h-5 w-5" /></div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Generated image display */}
                    <AnimatePresence>
                      {imgState?.url && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="overflow-hidden border-t border-white/8"
                        >
                          <div className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgState.url}
                              alt={img.concept}
                              className="w-full object-cover max-h-[500px]"
                            />
                            <a
                              href={imgState.url}
                              download={`主图${img.index}-${img.concept}.png`}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs bg-black/70 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-sm"
                            >
                              <Icon icon="lucide:download" className="h-3.5 w-3.5" />
                              下载
                            </a>
                          </div>
                        </motion.div>
                      )}
                      {imgState?.error && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-red-400 px-4 pb-3 flex items-center gap-1.5"
                        >
                          <Icon icon="lucide:alert-circle" className="h-3.5 w-3.5 shrink-0" />
                          {imgState.error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 4: Ops & CS */}
          <TabsContent value="ops" className="m-0 space-y-8 animate-in fade-in duration-500">
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">买家秀素材库 (多人设)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.reviews.map((rev, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 relative">
                    <Icon icon="lucide:quote" className="absolute top-3 right-3 h-8 w-8 text-white/5" />
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center">
                        <Icon icon="lucide:user" className="h-3 w-3 text-teal-500" />
                      </div>
                      <span className="text-xs font-medium text-teal-400">{rev.persona}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed italic">&quot;{rev.content}&quot;</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">问大家 Q&amp;A 官方话术</h3>
              <div className="space-y-3">
                {data.qna.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex gap-3 text-sm">
                      <span className="font-bold text-orange-400 shrink-0">Q:</span>
                      <span className="font-medium text-white">{item.question}</span>
                    </div>
                    <div className="flex gap-3 text-sm mt-3 pt-3 border-t border-white/5">
                      <span className="font-bold text-teal-400 shrink-0">A:</span>
                      <span className="text-zinc-400">{item.answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: Compliance */}
          <TabsContent value="compliance" className="m-0 space-y-6 animate-in fade-in duration-500">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
              <Icon icon="lucide:shield-alert" className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400">广告法合规提示</h4>
                <p className="text-xs text-zinc-400 mt-1">下述内容由 Agent 4 自动审核，标注了需要修改的用词并提供了合规替换版本。请按此修改后再上线。</p>
              </div>
            </div>

            {data.complianceNotes.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <Icon icon="lucide:check-circle-2" className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-400 font-medium">审核通过 — 未发现明显违禁用词</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.complianceNotes.map((note, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="flex gap-3 text-sm items-start">
                      <span className="font-bold text-red-400 shrink-0 mt-0.5">
                        <Icon icon="lucide:x-circle" className="h-4 w-4" />
                      </span>
                      <span className="text-red-300 line-through">{note.claim}</span>
                    </div>
                    <div className="flex gap-3 text-sm items-start pt-3 border-t border-zinc-800">
                      <span className="font-bold text-emerald-400 shrink-0 mt-0.5">
                        <Icon icon="lucide:check-circle" className="h-4 w-4" />
                      </span>
                      <span className="text-emerald-300">{note.compliantVersion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
