"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { WorkflowStepper, Step } from "@/components/agency/WorkflowStepper";
import MagneticButton from "@/app/components/MagneticButton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/UserProvider";

const STEPS: Step[] = [
  { id: "input", label: "素材准备", subLabel: "上传参考图与素材" },
  { id: "analyze", label: "美学解析", subLabel: "正在提取设计基因" },
  { id: "generate", label: "生成中", subLabel: "3D 光影实时拟合" },
  { id: "complete", label: "完成", subLabel: "导出高清详情图" },
];

export default function StyleReplicationPage() {
  const { credits } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const [productImg, setProductImg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const cost = 10;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'reference' | 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => {
        if (type === 'reference') setReferenceImg(prev.target?.result as string);
        else setProductImg(prev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startGeneration = async () => {
    if (!referenceImg || !productImg) {
      toast.error("请同时上传参考图和产品图");
      return;
    }

    if (credits && credits.credit_balance < cost) {
       toast.error("积分余额不足，请充值后继续", {
          action: {
             label: "去充值",
             onClick: () => window.location.href = "/pricing"
          }
       });
       return;
    }
    
    setIsGenerating(true);
    setCurrentStep(1);
    
    // Simulate Workflow
    setTimeout(() => setCurrentStep(2), 2000);
    setTimeout(() => {
      setCurrentStep(3);
      setIsGenerating(false);
      toast.success(`风格复刻成功！已消耗 ${cost} 积分`);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-2">
            Masterpiece <span className="font-semibold italic font-serif">Engine</span>
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide">
            风格复刻：把全世界的优秀设计变成您的专属模板
          </p>
        </div>

        {/* Stepper */}
        <WorkflowStepper steps={STEPS} currentStepIndex={currentStep} className="mb-20" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Controls */}
          <div className="space-y-8">
            {/* Tabs */}
            <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
              <button className="px-6 py-2 rounded-lg bg-white/10 text-xs font-bold transition-all">单图复刻</button>
              <button className="px-6 py-2 rounded-lg text-zinc-500 text-xs font-medium hover:text-white transition-all">批量复刻</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Reference Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">上传参考设计图</label>
                  <span className="text-[10px] text-zinc-600 font-bold">{referenceImg ? '1/12' : '0/12'}</span>
                </div>
                <div 
                  className={cn(
                    "aspect-square rounded-3xl border-2 border-dashed border-white/5 bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group",
                    referenceImg && "border-solid border-emerald-500/50"
                  )}
                  onClick={() => document.getElementById('ref-input')?.click()}
                >
                  {referenceImg ? (
                    <img src={referenceImg} className="w-full h-full object-cover" alt="Reference" />
                  ) : (
                    <>
                      <Icon icon="lucide:image-plus" className="w-8 h-8 text-white/20 group-hover:text-white/40 mb-2" />
                      <span className="text-[10px] text-white/30 px-4 text-center">点击或拖拽上传多张图片</span>
                    </>
                  )}
                  <input id="ref-input" type="file" hidden onChange={(e) => handleFileChange(e, 'reference')} />
                </div>
              </div>

              {/* Product Upload */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">产品素材图</label>
                <div 
                  className={cn(
                    "aspect-square rounded-3xl border-2 border-dashed border-white/5 bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group",
                    productImg && "border-solid border-emerald-500/50"
                  )}
                  onClick={() => document.getElementById('prod-input')?.click()}
                >
                  {productImg ? (
                    <img src={productImg} className="w-full h-full object-cover" alt="Product" />
                  ) : (
                    <>
                      <Icon icon="lucide:package-plus" className="w-8 h-8 text-white/20 group-hover:text-white/40 mb-2" />
                      <span className="text-[10px] text-white/30 text-center px-4">上传需要复刻风格的产品素材图</span>
                    </>
                  )}
                  <input id="prod-input" type="file" hidden onChange={(e) => handleFileChange(e, 'product')} />
                </div>
              </div>
            </div>

            {/* Config Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-3xl bg-white/3 border border-white/5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">模型选择</label>
                  <Icon icon="lucide:info" className="w-3 h-3 text-white/20" />
                </div>
                <button className="flex items-center justify-between w-full p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                  <span className="text-xs font-bold text-white/80">Nano Banana Pro</span>
                  <Icon icon="lucide:chevron-down" className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-all" />
                </button>
              </div>

              <div className="p-4 rounded-3xl bg-white/3 border border-white/5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">清晰度</label>
                  <Badge variant="outline" className="text-[8px] h-4 border-emerald-500/30 text-emerald-400">仅 PRO 可选 2K</Badge>
                </div>
                <div className="flex gap-2">
                   <button className="flex-1 p-2 rounded-xl bg-white/10 border border-white/10 text-[10px] font-bold">1K 标准</button>
                   <button className="flex-1 p-2 rounded-xl bg-white/5 text-zinc-600 text-[10px] font-bold cursor-not-allowed">2K 高清</button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white/3 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                   <Icon icon="heroicons:bolt-20-solid" className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80">Turbo 加速模式</span>
                  <span className="text-[10px] text-zinc-500">更快、更稳定</span>
                </div>
              </div>
              <button className="w-10 h-6 rounded-full bg-emerald-500 relative flex items-center px-1">
                <div className="w-4 h-4 rounded-full bg-white ml-auto shadow-lg shadow-emerald-900" />
              </button>
            </div>

            <MagneticButton 
              onClick={startGeneration}
              disabled={isGenerating}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all",
                (credits?.credit_balance ?? 0) < cost ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-white text-black hover:scale-[1.02] shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
              )}
            >
              {isGenerating ? "正在解析基因..." : ((credits?.credit_balance ?? 0) < cost ? "积分不足" : `立即复刻风格 (- ${cost} 积分)`)}
            </MagneticButton>
          </div>

          {/* Preview */}
          <div className="aspect-3/4 rounded-[2.5rem] bg-zinc-900 border border-white/5 relative overflow-hidden flex items-center justify-center shadow-2xl">
             <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase animate-pulse">Processing</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-zinc-700 flex flex-col items-center gap-4"
                  >
                    <Icon icon="lucide:eye" className="w-12 h-12 opacity-20" />
                    <span className="text-[10px] uppercase tracking-widest font-black opacity-40">Output Preview</span>
                  </motion.div>
                )}
             </AnimatePresence>
             
             {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-linear-to-tr from-white/5 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Narrative Section - Picset Style */}
        <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-12 bg-white/2 rounded-[3.5rem] p-12 border border-white/5">
           <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                 <Icon icon="lucide:dna" className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold">深度基因解析</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                领先的视觉特征提取技术，AI 能够像顶级设计师一样“读懂”大片的深度调性。
              </p>
           </div>
           <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                 <Icon icon="lucide:lightbulb" className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold">美学完美移植</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                不仅仅是模仿，更是赋予您的产品空间感知能力与大品牌的美学美学。
              </p>
           </div>
           <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                 <Icon icon="lucide:layers" className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold">光影实时拟合</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                物理级 3D 融合算法。自动计算产品表面的光影遮挡，确保 100% 真实拍摄质感。
              </p>
           </div>
        </div>

        {/* FAQ - Minimal Style */}
        <div className="mt-32 mb-40 max-w-2xl mx-auto space-y-12">
            <h2 className="text-2xl font-bold text-center tracking-tight">常见问题 (FAQ)</h2>
            {[
              { q: "风格复刻会造成版权侵权吗？", a: "AI 提取的是设计语言与视觉调性，而非直接复制素材，大幅降低侵权风险。" },
              { q: "构图很复杂，AI 会把产品搞变形吗？", a: "Masterpiece Engine 具备 3D 空间感知能力，能精确识别产品三维结构。" }
            ].map((faq, idx) => (
              <div key={idx} className="space-y-4 group">
                <h4 className="flex items-start gap-3 font-bold text-white/90">
                  <span className="text-emerald-500 font-serif italic">Q:</span> {faq.q}
                </h4>
                <p className="pl-6 text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
