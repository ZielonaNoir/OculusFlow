"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import MagneticButton from "@/app/components/MagneticButton";

interface SupplementInputFormProps {
  onGenerate: (data: {
    productName: string;
    coreIngredients: string;
    targetAudience: string;
    healthGoals: string;
    images: File[];
    imagePreviews: string[];
  }) => void;
  onStop: () => void;
  isGenerating: boolean;
  onFourViewsGenerated?: (urls: string[]) => void;
  onPreviewsChange?: (previews: string[]) => void;
}

export function SupplementInputForm({ onGenerate, onStop, isGenerating, onFourViewsGenerated, onPreviewsChange }: SupplementInputFormProps) {
  const [productName, setProductName] = useState("汤臣倍健 蛋白质粉 蛋白粉 600g");
  const [coreIngredients, setCoreIngredients] = useState("规格：600g/罐\n蛋白质含量：每份(25g)含蛋白质≥18g\n主要成分：乳清蛋白、大豆蛋白\n口味：原味\n适用人群：成人\n净含量：600g\n保质期：24个月\n生产标准：GB/T 22570\n信任背书：汤臣倍健品牌成立30年，国内营养补充剂领导品牌；京东自营旗舰店，月销10万+；通过GMP认证，国家食品安全标准生产；多次获得京东健康年度优质品牌奖\n促销模式 (选填)：买2罐享9折，满299元赠摇摇杯；京东物流次日达，支持7天无理由退换\n视觉风格：极简医疗 (Medical Clean)");
  const [targetAudience, setTargetAudience] = useState("25-45岁注重健康的都市白领、健身爱好者、中老年人群；追求高效补充优质蛋白质、维持肌肉量、提升免疫力的消费者");
  const [healthGoals, setHealthGoals] = useState("日常饮食蛋白质摄入不足，难以通过食物满足运动后肌肉修复需求；普通蛋白粉口感差、溶解性不好；担心添加剂多、成分不透明；中老年人肌肉流失加速，需要安全可靠的蛋白补充方案");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fourViewImages, setFourViewImages] = useState<string[]>([]);
  const [fourViewLoading, setFourViewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("supplement_agent_product_context");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.productName) setProductName(parsed.productName);
        if (parsed.coreIngredients) setCoreIngredients(parsed.coreIngredients);
        if (parsed.imagePreviews) setPreviews(parsed.imagePreviews);
        if (parsed.fourViewImages) setFourViewImages(parsed.fourViewImages);
      }
    } catch { /* ignore */ }
  }, []);

  // Notify parent whenever previews change (e.g. upload new image or delete)
  useEffect(() => {
    if (onPreviewsChange) {
      onPreviewsChange(previews);
    }
  }, [previews, onPreviewsChange]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      // Convert to base64 so they can be used as API refImages
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const b64 = ev.target?.result as string;
          setPreviews(prev => [...prev, b64]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !coreIngredients.trim()) return;
    onGenerate({ productName, coreIngredients, targetAudience, healthGoals, images, imagePreviews: previews });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 flex-1">
      <div className="space-y-4">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="productName" className="text-zinc-300">产品名称</Label>
          <Input
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={isGenerating}
            placeholder="例如：进口鱼油软胶囊、益生菌冻干粉"
            className="bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-teal-500"
          />
        </div>

        {/* Core Ingredients */}
        <div className="space-y-2">
          <Label htmlFor="coreIngredients" className="text-zinc-300">核心成分 / 规格参数</Label>
          <Textarea
            id="coreIngredients"
            value={coreIngredients}
            onChange={(e) => setCoreIngredients(e.target.value)}
            disabled={isGenerating}
            rows={10}
            placeholder="例如：NMN 500mg，NAD+ 前体，β-烟酰胺单核苷酸"
            className="bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-teal-500 font-mono text-sm resize-none"
          />
          <p className="text-[10px] text-zinc-500">填入品牌方语言即可，AI 将负责&ldquo;降维翻译&rdquo;为消费者人话。</p>
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience" className="text-zinc-300">目标客群 (标签化输入)</Label>
          <Textarea
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            disabled={isGenerating}
            rows={2}
            placeholder="例如：中老年人；40-65岁；注重心血管"
            className="bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-teal-500 font-mono text-sm resize-none"
          />
        </div>

        {/* Health Goals */}
        <div className="space-y-2">
          <Label htmlFor="healthGoals" className="text-zinc-300">健康功效诉求</Label>
          <Textarea
            id="healthGoals"
            value={healthGoals}
            onChange={(e) => setHealthGoals(e.target.value)}
            disabled={isGenerating}
            rows={4}
            placeholder="例如：护心血管、降甘油三酯、促进睡眠"
            className="bg-black/30 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-teal-500 text-sm font-mono resize-none"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2 mt-2">
          <div className="flex justify-between items-center">
            <Label className="text-zinc-300">产品图 (可选)</Label>
            <span className="text-[10px] text-zinc-500">{images.length} / 5</span>
          </div>
          <div
            onClick={() => !isGenerating && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isGenerating
                ? "border-zinc-800 opacity-50 cursor-not-allowed"
                : previews.length > 0
                ? "border-teal-500/50 bg-teal-500/5 hover:border-teal-500 hover:bg-teal-500/10"
                : "border-zinc-700 hover:border-teal-500 hover:bg-teal-500/5 bg-white/5"
            } min-h-[120px]`}
          >
            {previews.length === 0 ? (
              <>
                <Icon icon="lucide:pill" className="h-7 w-7 text-zinc-400 mb-2" />
                <span className="text-sm font-medium text-zinc-300">添加产品外观图</span>
                <span className="text-xs text-zinc-500 mt-1">AI 将协助解析外包装信息</span>
              </>
            ) : (
              <div className="flex gap-3 flex-wrap justify-center w-full">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-md overflow-hidden ring-1 ring-white/10 bg-black shrink-0">
                    <img src={src} alt="preview" className="w-full h-full object-cover" />
                    {!isGenerating && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 bg-black/60 backdrop-blur-md rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                      >
                        <Icon icon="lucide:x" className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
                {previews.length < 5 && !isGenerating && (
                  <div className="w-16 h-16 rounded-md border border-dashed border-zinc-600 bg-white/5 flex flex-col items-center justify-center shrink-0 hover:border-teal-400 hover:text-teal-400 text-zinc-500 transition-colors">
                    <Icon icon="lucide:plus" className="h-6 w-6" />
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isGenerating}
            />
          </div>
        </div>
      </div>

      {/* Four-view generation section — shown when product image(s) are uploaded */}
      {previews.length > 0 && (
        <div className="mt-4 space-y-3 px-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Icon icon="lucide:cube" className="h-4 w-4 text-teal-400" />
              产品四视图
            </span>
            <button
              type="button"
              disabled={fourViewLoading || isGenerating}
              onClick={async () => {
                setFourViewLoading(true);
                setFourViewImages([]);
                try {
                  const res = await fetch("/api/oculus/image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      prompt: "产品包装四视图，一张图展示同一产品的正面、背面、左侧面、右侧面四个角度，2x2网格布局，纯白背景，专业产品拍摄风格，高清晰度。",
                      moduleType: "four_view",
                      modelId: "doubao-seedream-4-5-251128",
                      refImages: previews.slice(0, 3),
                      imageOptions: {
                        size: "2048x2048",
                        watermark: false,
                      },
                    }),
                  });
                  const data = await res.json() as { image_url: string | null; status: string; urls?: string[] };
                  const urls: string[] = data.urls ?? (data.image_url ? [data.image_url] : []);
                  setFourViewImages(urls);
                  onFourViewsGenerated?.(urls);
                } catch { /* ignore */ } finally {
                  setFourViewLoading(false);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fourViewLoading ? (
                <><Icon icon="lucide:loader-2" className="h-3.5 w-3.5 animate-spin" /> 生成中...</>
              ) : (
                <><Icon icon="lucide:wand-2" className="h-3.5 w-3.5" /> 即梦出四视图</>
              )}
            </button>
          </div>

          {/* Single composite four-view image */}
          {fourViewLoading && (
            <div className="aspect-video rounded-lg bg-white/5 border border-white/8 flex items-center justify-center">
              <Icon icon="lucide:loader-2" className="h-8 w-8 text-zinc-600 animate-spin" />
            </div>
          )}
          {fourViewImages.length > 0 && !fourViewLoading && (
            <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fourViewImages[0]} alt="四视图" className="w-full object-contain" />
              <a
                href={fourViewImages[0]}
                download="四视图.jpg"
                target="_blank"
                rel="noreferrer"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm"
              >
                <Icon icon="lucide:download" className="h-3.5 w-3.5" /> 下载
              </a>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 flex gap-3">
        {isGenerating ? (
          <MagneticButton
            onClick={onStop}
            type="button"
            className="flex-1 h-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
          >
            <Icon icon="lucide:square" className="h-4 w-4" />
            紧急中断
          </MagneticButton>
        ) : (
          <MagneticButton
            type="submit"
            className="flex-1 h-12 bg-linear-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] shadow-lg shadow-teal-500/25"
          >
            <Icon icon="lucide:flask-conical" className="h-5 w-5" />
            交由 AI 策划保健品全案
          </MagneticButton>
        )}
      </div>
    </form>
  );
}
