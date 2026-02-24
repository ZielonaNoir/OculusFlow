"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { WorkflowStepper, Step } from "@/components/agency/WorkflowStepper";
import MagneticButton from "@/app/components/MagneticButton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/UserProvider";

const STEPS: Step[] = [
  { id: "upload", label: "上传图片", subLabel: "产品图与细节图" },
  { id: "analyze", label: "AI 分析", subLabel: "模型款式与材质识别" },
  { id: "plan", label: "预览方案", subLabel: "确认组图叙事逻辑" },
  { id: "generate", label: "生成中", subLabel: "构建 3D 渲染场景" },
  { id: "complete", label: "完成", subLabel: "高清成品导出" },
];

export default function SetGenerationPage() {
  const { credits } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [productImg, setProductImg] = useState<string | null>(null);
  const [modelTryOn, setModelTryOn] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const cost = 30;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (prev) => setProductImg(prev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startGeneration = async () => {
    if (!productImg) {
      toast.error("请先上传产品素材图");
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
    
    // Workflow Simulation (5 steps)
    setTimeout(() => setCurrentStep(2), 2500); // Analyze
    setTimeout(() => setCurrentStep(3), 5000); // Plan
    setTimeout(() => {
      setCurrentStep(4); // Complete
      setIsGenerating(false);
      toast.success(`全渠道组图方案已就绪！已消耗 ${cost} 积分`);
    }, 8500);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-12 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-2">
            AI Set <span className="font-semibold italic font-serif">Generator</span>
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide">
            智能组图：从 0 到 1 自动构建整套商业视觉方案
          </p>
        </div>

        {/* Stepper */}
        <WorkflowStepper steps={STEPS} currentStepIndex={currentStep} className="mb-20" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Controls - 5 cols */}
          <div className="lg:col-span-5 space-y-8">
            {/* Mode Switcher */}
            <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
              <button 
                onClick={() => setModelTryOn(false)}
                className={cn("px-6 py-2 rounded-lg text-xs font-bold transition-all", !modelTryOn ? "bg-white/10 text-white" : "text-zinc-500")}
              >
                基础套图
              </button>
              <button 
                onClick={() => setModelTryOn(true)}
                className={cn("px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2", modelTryOn ? "bg-white/10 text-white" : "text-zinc-500")}
              >
                模特试穿
                <Badge variant="outline" className="text-[8px] h-3 px-1 border-amber-500/30 text-amber-500 bg-amber-500/5">Beta</Badge>
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">产品图 / 细节图</label>
              <div 
                className={cn(
                  "aspect-video rounded-3xl border-2 border-dashed border-white/5 bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group",
                  productImg && "border-solid border-emerald-500/50"
                )}
                onClick={() => document.getElementById('set-input')?.click()}
              >
                {productImg ? (
                  <img src={productImg} className="w-full h-full object-cover" alt="Product" />
                ) : (
                  <>
                    <Icon icon="lucide:image-plus" className="w-8 h-8 text-white/20 group-hover:text-white/40 mb-2" />
                    <span className="text-[10px] text-white/30">上传多角度产品图或细节图 (0/6)</span>
                  </>
                )}
                <input id="set-input" type="file" hidden onChange={handleFileChange} />
              </div>
            </div>

            {modelTryOn && (
               <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">模特图 (可选)</label>
                  <div className="h-24 rounded-2xl border border-white/5 bg-white/2 flex items-center justify-center border-dashed group cursor-pointer hover:bg-white/5 transition-all">
                     <div className="flex flex-col items-center">
                        <Icon icon="lucide:user-plus" className="w-5 h-5 text-white/20 group-hover:text-white/40 mb-1" />
                        <span className="text-[8px] text-zinc-500">上传模特或 AI 生成</span>
                     </div>
                  </div>
               </div>
            )}

            {/* Config */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">组图要求</label>
                <textarea 
                  className="w-full h-32 rounded-2xl bg-white/3 border border-white/5 p-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all resize-none"
                  placeholder="建议输入：款式名称、面料材质、设计亮点、适合人群、风格调性等..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">模型</label>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-white/80">Nano Banana Pro</div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">清晰度</label>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-white/80">2K 高清 (PRO)</div>
                 </div>
              </div>
            </div>

            <MagneticButton 
              onClick={startGeneration}
              disabled={isGenerating}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all",
                (credits?.credit_balance ?? 0) < cost ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-white text-black hover:scale-[1.02] shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
              )}
            >
              {isGenerating ? "正在智能分析中..." : ((credits?.credit_balance ?? 0) < cost ? "积分不足" : `分析产品并生成方案 (- ${cost} 积分)`)}
            </MagneticButton>
          </div>

          {/* Preview / Type Selection - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between mb-4">
               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">方案选择类型 (多选)</label>
               <span className="text-[10px] text-white/40 font-bold">已选 3 项</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "白底精修图", desc: "纯白背景的产品精修展示图", icon: "lucide:sparkles" },
                { title: "3D立体效果图", desc: "具有立体感和层次感的产品展示", icon: "lucide:box" },
                { title: "细节特写图", desc: "展示产品细节和材质的特写图", icon: "lucide:zoom-in" },
                { title: "卖点图", desc: "突出产品核心卖点的营销展示图", icon: "lucide:megaphone" }
              ].map((type, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "p-5 rounded-3xl bg-white/2 border border-white/5 hover:border-white/20 transition-all cursor-pointer group",
                    i < 3 && "border-emerald-500/30 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                  )}
                >
                   <div className="flex items-start justify-between mb-4">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform">
                         <Icon icon={type.icon} className="w-5 h-5 text-white/60" />
                      </div>
                      <div className={cn("w-4 h-4 rounded-full border border-white/20 flex items-center justify-center", i < 3 && "bg-emerald-500 border-emerald-500")}>
                         {i < 3 && <Icon icon="lucide:check" className="w-3 h-3 text-black" />}
                      </div>
                   </div>
                   <h4 className="text-sm font-bold mb-1">{type.title}</h4>
                   <p className="text-[10px] text-zinc-500 tracking-wide leading-relaxed">{type.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-12 p-8 rounded-[2.5rem] bg-zinc-900 border border-white/5 flex flex-col items-center justify-center text-center gap-6 group overflow-hidden relative">
               <Icon icon="lucide:package-open" className="w-16 h-16 text-zinc-800 animate-bounce" />
               <div className="space-y-2">
                  <h3 className="text-sm font-bold text-zinc-400">生成结果预览</h3>
                  <p className="text-[10px] text-zinc-600 max-w-[240px] leading-relaxed">
                    上传产品图并填写要求后，点击“分析产品”开始预览您的商业组图方案
                  </p>
               </div>
               {/* Glossy Overlay */}
               <div className="absolute inset-0 bg-linear-to-tr from-white/2 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
