"use client";

import React, { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OculusFormData, ArkImageGenOptions } from "./types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InputFormProps {
  onFormChange: (data: OculusFormData) => void;
  onGenerate: (data: OculusFormData) => void;
  onStop: () => void;
  isGenerating: boolean;
  arkOptions?: ArkImageGenOptions;
}

// 四视图生成：强调严格依据参考图产品形态，请求时会携带 1 张产品参考图 (refImages) + 后端 strength 提高参考图权重
const FOUR_VIEW_PROMPT =
  "严格依据参考图中的产品，保持该产品的形态、外观与细节不变。仅将参考图产品拆分为四宫格展示：正视图、侧视图、后视图、透视视图。极简白色背景，影棚灯光，高细节，8k分辨率，产品渲染效果图。";

// JD product demo data for quick testing
const JD_DEMO_DATA: Partial<OculusFormData> = {
  productName: "汤臣倍健 蛋白质粉 蛋白粉 600g",
  coreSpecs:
    "规格：600g/罐\n蛋白质含量：每份(25g)含蛋白质≥18g\n主要成分：乳清蛋白、大豆蛋白\n口味：原味\n适用人群：成人\n净含量：600g\n保质期：24个月\n生产标准：GB/T 22570",
  targetAudience:
    "25-45岁注重健康的都市白领、健身爱好者、中老年人群；追求高效补充优质蛋白质、维持肌肉量、提升免疫力的消费者",
  painPoints:
    "日常饮食蛋白质摄入不足，难以通过食物满足运动后肌肉修复需求；普通蛋白粉口感差、溶解性不好；担心添加剂多、成分不透明；中老年人肌肉流失加速，需要安全可靠的蛋白补充方案",
  trustEndorsement:
    "汤臣倍健品牌成立30年，国内营养补充剂领导品牌；京东自营旗舰店，月销10万+；通过GMP认证，国家食品安全标准生产；多次获得京东健康年度优质品牌奖",
  sellingMode: "买2罐享9折，满299元赠摇摇杯；京东物流次日达，支持7天无理由退换",
  visualStyle: "Medical_Clean",
};

export function InputForm({ onFormChange, onGenerate, onStop, isGenerating, arkOptions }: InputFormProps) {
  const [formData, setFormData] = useState<OculusFormData>({
    productName: "",
    coreSpecs: "",
    targetAudience: "",
    painPoints: "",
    trustEndorsement: "",
    visualStyle: "Medical_Clean",
    sampleCount: 1,
    productImages: [],
  });
  const [isFilled, setIsFilled] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleForceDownload = (url: string, filename: string) => {
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
      .then((response) => response.blob())
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
      .catch((error) => {
        console.error("Download failed:", error);
        window.open(url, "_blank");
      });
  };

  const handleChange = (key: keyof OculusFormData, value: unknown) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    onFormChange(newData);
  };

  const handlePrefill = useCallback(() => {
    const newData: OculusFormData = {
      ...formData,
      ...JD_DEMO_DATA,
      sampleCount: formData.sampleCount,
    };
    setFormData(newData);
    onFormChange(newData);
    setIsFilled(true);
  }, [formData, onFormChange]);

  const handleClear = useCallback(() => {
    const newData: OculusFormData = {
      productName: "",
      coreSpecs: "",
      targetAudience: "",
      painPoints: "",
      trustEndorsement: "",
      sellingMode: "",
      visualStyle: "Medical_Clean",
      sampleCount: formData.sampleCount,
      productImages: [],
    };
    setFormData(newData);
    onFormChange(newData);
    setIsFilled(false);
  }, [formData.sampleCount, onFormChange]);

  const [replaceImageIndex, setReplaceImageIndex] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const currentImages = formData.productImages || [];

    if (replaceImageIndex !== null) {
      const idx = replaceImageIndex;
      setReplaceImageIndex(null);
      const next = [...currentImages];
      next[idx] = files[0];
      handleChange("productImages", next);
      return;
    }

    const availableSlots = 6 - currentImages.length;
    if (availableSlots <= 0) return;
    const newImages = files.slice(0, availableSlots);
    handleChange("productImages", [...currentImages, ...newImages]);
  };

  const replaceImageAt = (index: number) => {
    setReplaceImageIndex(index);
    replaceInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    const currentImages = formData.productImages || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    handleChange("productImages", newImages);
  };

  const handleSubmit = () => {
    if (isGenerating) {
      onStop();
    } else {
      onGenerate(formData);
    }
  };

  const inputClasses =
    "border-white/10 bg-white/5 pl-9 text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:bg-white/10 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300 hover:border-white/20";
  const labelClasses = "text-xs font-semibold uppercase tracking-wider text-zinc-400";

  return (
    <div className="space-y-8">
      {/* JD Demo Pre-fill Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon icon="simple-icons:jd" className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-300 leading-tight">京东商品示例数据</p>
              <p className="text-[10px] text-amber-500/70 font-mono truncate">汤臣倍健蛋白质粉 · 一键填充测试</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isFilled && (
              <motion.button
                onClick={handleClear}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-all"
              >
                <Icon icon="lucide:x" className="h-3 w-3" />
                清空
              </motion.button>
            )}
            <motion.button
              onClick={handlePrefill}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/60 transition-all"
            >
              <Icon icon="lucide:zap" className="h-3.5 w-3.5" />
              {isFilled ? "重新填充" : "一键填充"}
            </motion.button>
          </div>
        </div>
      </div>
      {/* Product Name */}
      <div className="space-y-3 group">
        <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>产品名称</Label>
        <div className="relative">
          <Icon icon="lucide:package" className="absolute left-3 top-3 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
          <Input
            value={formData.productName}
            onChange={(e) => handleChange("productName", e.target.value)}
            className={inputClasses}
            placeholder="输入产品名称"
          />
        </div>
      </div>

      {/* Core Specs */}
      <div className="space-y-3 group">
        <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>核心规格</Label>
        <Textarea
          value={formData.coreSpecs}
          onChange={(e) => handleChange("coreSpecs", e.target.value)}
          className={cn(inputClasses, "min-h-[100px] pl-3")}
          placeholder="输入核心规格参数"
        />
      </div>

      {/* Target Audience */}
      <div className="space-y-3 group">
        <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>目标人群</Label>
        <div className="relative">
          <Icon icon="lucide:users" className="absolute left-3 top-3 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
          <Input
            value={formData.targetAudience}
            onChange={(e) => handleChange("targetAudience", e.target.value)}
            className={inputClasses}
            placeholder="描述目标人群画像"
          />
        </div>
      </div>

      {/* Pain Points */}
      <div className="space-y-3 group">
        <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>用户痛点</Label>
        <Textarea
          value={formData.painPoints}
          onChange={(e) => handleChange("painPoints", e.target.value)}
          className={cn(inputClasses, "min-h-[100px] pl-3")}
          placeholder="描述用户痛点场景"
        />
      </div>

      {/* Trust Endorsement */}
      <div className="space-y-3 group">
        <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>信任背书</Label>
        <div className="relative">
          <Icon icon="lucide:award" className="absolute left-3 top-3 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
          <Input
            value={formData.trustEndorsement}
            onChange={(e) => handleChange("trustEndorsement", e.target.value)}
            className={inputClasses}
            placeholder="榜单排名、销量数据"
          />
        </div>
      </div>

      {/* Selling Mode */}
      <div className="space-y-3 group">
        <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>促销模式 (选填)</Label>
        <div className="relative">
          <Icon icon="lucide:tag" className="absolute left-3 top-3 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
          <Input
            value={formData.sellingMode || ""}
            onChange={(e) => handleChange("sellingMode", e.target.value)}
            className={inputClasses}
            placeholder="满减、赠品、物流时效"
          />
        </div>
      </div>

      {/* Visual Style */}
      <div className="space-y-3 group">
        <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>视觉风格</Label>
        <Select
          value={formData.visualStyle}
          onValueChange={(value) => handleChange("visualStyle", value)}
        >
          <SelectTrigger className={cn(inputClasses, "pl-3")}>
            <SelectValue placeholder="选择视觉风格" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950/90 text-zinc-300 backdrop-blur-xl">
            <SelectItem value="Tech_Blue" className="focus:bg-blue-500/20 focus:text-blue-300">科技蓝金 (Tech Blue)</SelectItem>
            <SelectItem value="Medical_Clean" className="focus:bg-blue-500/20 focus:text-blue-300">极简医疗 (Medical Clean)</SelectItem>
            <SelectItem value="Vitality_Orange" className="focus:bg-blue-500/20 focus:text-blue-300">活力橙色 (Vitality Orange)</SelectItem>
            <SelectItem value="Cyberpunk" className="focus:bg-blue-500/20 focus:text-blue-300">赛博朋克 (Cyberpunk)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sample Count — Custom Segmented Selector */}
      <div className="space-y-4 rounded-xl border border-white/5 bg-white/5 p-5 transition-colors hover:bg-white/[0.07] hover:border-white/10">
        <div className="flex items-center justify-between">
          <Label className={labelClasses}>生成方案数量</Label>
          <motion.span
            key={formData.sampleCount}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-sm font-bold text-blue-400"
          >
            {formData.sampleCount} 套
          </motion.span>
        </div>

        {/* Segmented Control */}
        <div className="relative flex gap-2 rounded-xl bg-black/30 p-1.5 border border-white/5">
          {[1, 2, 3].map((n) => {
            const isActive = formData.sampleCount === n;
            const labels = ["精准", "对比", "全套"];
            const sublabels = ["1 variant", "2 variants", "3 variants"];
            return (
              <button
                key={n}
                onClick={() => handleChange("sampleCount", n)}
                className="relative flex-1 rounded-lg py-3 text-center transition-all duration-300 focus:outline-none"
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="segment-active"
                    className="absolute inset-0 rounded-lg bg-linear-to-br from-blue-600/80 to-blue-800/80 shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-400/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-bold transition-colors duration-200",
                      isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {labels[n - 1]}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[9px] transition-colors duration-200",
                      isActive ? "text-blue-200/70" : "text-zinc-600"
                    )}
                  >
                    {sublabels[n - 1]}
                  </span>
                </div>
                {/* Glow dot */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-300 shadow-[0_0_6px_rgba(147,197,253,1)]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Style description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={formData.sampleCount}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] text-zinc-500 font-mono text-center"
          >
            {formData.sampleCount === 1
              ? "生成 1 套最优方案，快速验证"
              : formData.sampleCount === 2
                ? "生成 2 套风格对比，权衡选择"
                : "生成 3 套完整方案，A/B/C 测试"}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Product Image Upload (Multi-Image Grid) */}
      <div className="space-y-3 group">
        <div className="flex items-center justify-between">
          <Label className={cn(labelClasses, "group-focus-within:text-blue-400 transition-colors")}>
            产品参考图 (最多6张)
          </Label>
          <span className="text-[10px] text-zinc-500 font-mono">
            {formData.productImages?.length || 0} / 6
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Upload Button */}
          {(formData.productImages?.length || 0) < 6 && (
            <label className="group/upload relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 transition-all hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Icon icon="lucide:plus" className="h-6 w-6 text-zinc-500 transition-colors group-hover/upload:text-blue-400" />
              <span className="mt-1 text-[10px] text-zinc-500 group-hover/upload:text-blue-300">添加图片</span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
            </label>
          )}

          {/* Image List */}
          {formData.productImages?.map((img, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-xl border border-white/10 shadow-lg group-hover:border-white/30 transition-colors bg-black/40 group/img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  img instanceof File
                    ? URL.createObjectURL(img)
                    : typeof img === "string"
                      ? img
                      : ""
                }
                alt={`Ref ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    replaceImageAt(index);
                  }}
                  className="rounded-full bg-black/60 p-1 text-white hover:bg-blue-500/80 transition-colors backdrop-blur-sm"
                  title="替换图片"
                >
                  <Icon icon="lucide:image-plus" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="rounded-full bg-black/60 p-1 text-white hover:bg-red-500/80 transition-colors backdrop-blur-sm"
                  title="删除"
                >
                  <Icon icon="lucide:x" className="h-3 w-3" />
                </button>
              </div>
              {index === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[9px] text-white font-mono backdrop-blur-sm">
                  主参考
                </div>
              )}
            </div>
          ))}
        </div>
        <input
          ref={replaceInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          aria-label="替换参考图"
        />
      </div>

      {/* Four-View Generation Section */}
      <AnimatePresence>
        {formData.productImages && formData.productImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <Label className={cn(labelClasses, "text-blue-300")}>四视图参考生成 (可选)</Label>
              {formData.fourViewImage && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useFourViewRef ?? true}
                      onChange={(e) => handleChange("useFourViewRef", e.target.checked)}
                      className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0"
                    />
                    作为后续生成参考
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              {!formData.fourViewImage ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <p className="text-[10px] text-blue-200/70 text-center">
                    生成产品的正、侧、背三视图/四视图，<br />
                    相比白底图，能为 AI 提供更立体的结构参考。
                  </p>
                  <GenerateFourViewButton
                    productImage={formData.productImages![0]}
                    onGenerate={(url) => {
                      setFormData((prev) => {
                        const next = { ...prev, fourViewImage: url, useFourViewRef: true };
                        onFormChange(next);
                        return next;
                      });
                    }}
                    arkOptions={arkOptions}
                  />
                </div>
              ) : (
                <div className="relative group/view">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.fourViewImage}
                    alt="Four View"
                    className="w-full rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewImage(formData.fourViewImage || null)}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(formData.fourViewImage || null);
                      }}
                      className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 backdrop-blur-sm shadow-sm border border-white/10"
                      title="预览大图"
                    >
                      <Icon icon="lucide:eye" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (formData.fourViewImage) {
                          handleForceDownload(
                            formData.fourViewImage,
                            `four-view-${Date.now()}.png`
                          );
                        }
                      }}
                      className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 backdrop-blur-sm shadow-sm border border-white/10"
                      title="下载图片"
                    >
                      <Icon icon="lucide:download" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChange("fourViewImage", null);
                      }}
                      className="rounded-md bg-black/60 p-1.5 text-white hover:bg-red-500/80 backdrop-blur-sm shadow-sm border border-white/10"
                      title="清除"
                    >
                      <Icon icon="lucide:trash-2" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 提示词与参考图说明：可展开查看本次生成使用的 prompt 及是否携带参考图 */}
            <FourViewPromptInfo />
          </motion.div>
        )}

      </AnimatePresence>

      {/* Generate / Stop Button */}
      <div className="pt-2">
        <motion.button
          onClick={handleSubmit}
          whileHover={{ scale: isGenerating ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "relative w-full overflow-hidden rounded-xl py-4 font-semibold text-sm tracking-wider uppercase transition-all duration-500",
            isGenerating
              ? "bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900/60"
              : "bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] border border-blue-400/20"
          )}
        >
          {/* Shimmer effect when idle */}
          {!isGenerating && (
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
            />
          )}

          {/* Pulse ring when generating */}
          {isGenerating && (
            <motion.div
              className="absolute inset-0 rounded-xl border border-red-500/50"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}

          <span className="relative z-10 flex items-center justify-center gap-2.5">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.span
                  key="stop"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    className="h-3.5 w-3.5 rounded-sm bg-red-400"
                    animate={{ scale: [1, 0.8, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  停止生成
                </motion.span>
              ) : (
                <motion.span
                  key="generate"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2"
                >
                  <Icon icon="lucide:sparkles" className="h-4 w-4" />
                  生成详情页方案
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.button>

        {/* Hint text */}
        <p className="mt-2 text-center text-[10px] text-zinc-600 font-mono">
          {isGenerating ? "AI 正在分析产品数据..." : "填写产品信息后点击生成"}
        </p>
      </div>
      <ImagePreviewDialog
        imageUrl={previewImage}
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        onDownload={() =>
          previewImage && handleForceDownload(previewImage, `four-view-${Date.now()}.png`)
        }
        onDelete={() => {
          handleChange("fourViewImage", null);
          setPreviewImage(null);
        }}
      />
    </div>
  );
}

function FourViewPromptInfo() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[10px] text-zinc-400 hover:bg-white/5 hover:text-zinc-300 transition-colors"
        title={expanded ? "收起" : "展开查看提示词与参考图说明"}
      >
        <span className="font-medium">查看本次提示词与参考图说明</span>
        <Icon
          icon={expanded ? "lucide:chevron-up" : "lucide:chevron-down"}
          className="h-3.5 w-3.5 shrink-0"
        />
      </button>
      {expanded && (
        <div className="border-t border-white/10 px-3 py-2 space-y-2 text-[10px]">
          <div>
            <span className="text-zinc-500 font-medium">提示词：</span>
            <p className="mt-0.5 text-zinc-400 font-mono leading-relaxed break-words">
              {FOUR_VIEW_PROMPT}
            </p>
          </div>
          <p className="text-zinc-500">
            <span className="font-medium">参考图：</span> 生成四视图时会携带
            <strong className="text-blue-300"> 1 张产品参考图</strong>
            （主参考），与上述提示词一并发送给 AI 进行图生图。
          </p>
        </div>
      )}
    </div>
  );
}

function GenerateFourViewButton({
  productImage,
  onGenerate,
  arkOptions,
}: {
  productImage: File | string;
  onGenerate: (url: string) => void;
  arkOptions?: ArkImageGenOptions;
}) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!productImage) {
      toast.error("请先上传产品参考图");
      return;
    }
    if (productImage instanceof File && productImage.size === 0) {
      toast.error("请先上传产品参考图");
      return;
    }
    if (typeof productImage === "string" && !productImage.trim()) {
      toast.error("请先上传产品参考图");
      return;
    }

    setLoading(true);
    try {
      let refImageBase64 = "";
      if (productImage instanceof File) {
        refImageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(productImage);
        });
      } else {
        refImageBase64 = productImage;
      }

      const response = await fetch("/api/oculus/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: FOUR_VIEW_PROMPT,
          moduleType: "four_view",
          refImages: [refImageBase64],
          imageOptions: arkOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error || "四视图生成失败");
        return;
      }

      const imageUrl =
        data.image_url ||
        (data.b64_json ? `data:image/png;base64,${data.b64_json}` : null);
      if (imageUrl) {
        onGenerate(imageUrl);
      } else {
        toast.error("未返回图片，请重试");
      }
    } catch (error) {
      console.error("Error generating 4-view:", error);
      toast.error("四视图生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleGenerate}
      disabled={loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Icon icon="lucide:loader-2" className="h-3.5 w-3.5 animate-spin" />
          生成中...
        </>
      ) : (
        <>
          <Icon icon="lucide:box" className="h-3.5 w-3.5" />
          生成四视图
        </>
      )}
    </motion.button>
  );
}

// ----------------------------------------------------------------------
// Image Preview Dialog (shadcn Dialog)
// ----------------------------------------------------------------------

function ImagePreviewDialog({
  imageUrl,
  open,
  onOpenChange,
  onDownload,
  onDelete,
}: {
  imageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  if (!imageUrl) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[90vw] max-h-[90vh] w-auto border-white/10 bg-zinc-950 p-0 overflow-hidden gap-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">四视图大图预览</DialogTitle>
        <div className="relative flex items-center justify-center bg-black/80 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Full Preview"
            className="max-h-[85vh] w-auto object-contain rounded-lg"
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={onDownload}
              className="rounded-full bg-black/50 hover:bg-white/20 h-9 w-9"
              title="下载"
            >
              <Icon icon="lucide:download" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={onDelete}
              className="rounded-full bg-red-950/50 hover:bg-red-900/50 h-9 w-9 text-red-400"
              title="删除"
            >
              <Icon icon="lucide:trash-2" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-black/50 hover:bg-white/20 h-9 w-9"
              title="关闭"
            >
              <Icon icon="lucide:x" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

