"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { WorkflowStepper, Step } from "@/components/agency/WorkflowStepper";
import MagneticButton from "@/app/components/MagneticButton";
import { toast } from "sonner";
import { useUser } from "@/components/UserProvider";

const STEPS: Step[] = [
  { id: "upload", label: "批量上传", subLabel: "支持 JPG/PNG/WebP" },
  { id: "process", label: "智能处理", subLabel: "并行计算边缘抠图" },
  { id: "upscale", label: "高清放大", subLabel: "AI 超分四倍增强" },
  { id: "batch", label: "打包下载", subLabel: "高清成品一键导出" },
];

const FEATURES = [
  { id: 'bg-remove', name: '智能抠图', icon: 'lucide:scissors', cost: 2 },
  { id: 'upscale', name: '4K 放大', icon: 'lucide:maximize', cost: 5 },
  { id: 'cleanup', name: '瑕疵消除', icon: 'lucide:eraser', cost: 3 },
  { id: 'color', name: '自动调色', icon: 'lucide:palette', cost: 1 },
];

export default function RetouchPage() {
  const { credits } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['bg-remove']);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalCost = files.length * selectedFeatures.reduce((acc, f) => {
    const feature = FEATURES.find(feat => feat.id === f);
    return acc + (feature?.cost || 0);
  }, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      const readers = newFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (prev) => resolve(prev.target?.result as string);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then(results => setFiles(prev => [...prev, ...results]));
    }
  };

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const startBatchProcess = async () => {
    if (files.length === 0) {
      toast.error("请先上传需要处理的图片");
      return;
    }

    if (credits && credits.credit_balance < totalCost) {
       toast.error("积分余额不足，请充值后继续");
       return;
    }
    
    setIsProcessing(true);
    setCurrentStep(1);
    
    // Batch Simulation
    setTimeout(() => setCurrentStep(2), 3000);
    setTimeout(() => {
      setCurrentStep(3);
      setIsProcessing(false);
      toast.success(`批量处理完成！已消耗 ${totalCost} 积分`);
    }, 7000);
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

        <WorkflowStepper steps={STEPS} currentStepIndex={currentStep} className="mb-20" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">功能组 (可多选)</label>
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => toggleFeature(feature.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                      selectedFeatures.includes(feature.id) 
                        ? "bg-white/10 border-white/20 text-white" 
                        : "bg-white/2 border-white/5 text-zinc-500 hover:bg-white/5"
                    )}
                  >
                    <Icon icon={feature.icon} className={cn("w-5 h-5", selectedFeatures.includes(feature.id) ? "text-emerald-500" : "text-zinc-700")} />
                    <div className="flex-1">
                      <div className="text-xs font-bold">{feature.name}</div>
                      <div className="text-[8px] opacity-50">{feature.cost} 积分/张</div>
                    </div>
                    {selectedFeatures.includes(feature.id) && <Icon icon="lucide:check-circle-2" className="w-4 h-4 text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">上传原始素材 (Batch)</label>
               <div 
                 className="aspect-video rounded-4xl border-2 border-dashed border-white/5 bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                 onClick={() => document.getElementById('batch-input')?.click()}
               >
                 <Icon icon="lucide:upload-cloud" className="w-10 h-10 text-white/20 group-hover:text-white/40 mb-3" />
                 <span className="text-xs text-white/40 font-bold">点击上传或拖拽图片 (最多 100 张)</span>
                 <input 
                   id="batch-input"
                   type="file" 
                   multiple
                   accept="image/*"
                   className="hidden" 
                   onChange={handleFileChange}
                 />
               </div>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">待处理项目</span>
                  <span className="font-bold">{files.length} 张</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">单张费用</span>
                  <span className="font-bold">{totalCost / (files.length || 1)} 积分</span>
               </div>
               <div className="pt-4 border-t border-emerald-500/10 flex justify-between items-center">
                  <span className="text-sm font-bold">预计消耗总积分</span>
                  <span className="text-xl font-black text-emerald-500">{totalCost}</span>
               </div>
            </div>

            <MagneticButton 
              onClick={startBatchProcess}
              disabled={isProcessing || files.length === 0}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                (credits?.credit_balance ?? 0) < totalCost || files.length === 0
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                  : "bg-white text-black hover:scale-[1.02] shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
              )}
            >
              {isProcessing ? "正在并行处理中..." : ((credits?.credit_balance ?? 0) < totalCost ? "积分不足" : "开始批量精修")}
            </MagneticButton>
          </div>

          {/* Preview / Queue */}
          <div className="lg:col-span-7 space-y-6">
             <div className="p-8 rounded-[3rem] bg-zinc-950/50 border border-white/5 min-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">处理队列进度</h3>
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] text-zinc-600 font-bold">SUCCESS: 0</span>
                      <span className="text-[10px] text-zinc-600 font-bold">REMAINING: {files.length}</span>
                   </div>
                </div>

                {files.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {files.map((file, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden relative group"
                      >
                         <img src={file} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="Queue Item" />
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon icon="lucide:eye" className="w-5 h-5" />
                         </div>
                         {isProcessing && i < (currentStep * 3) && (
                           <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                              <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin text-emerald-500" />
                           </div>
                         )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-20">
                     <Icon icon="lucide:images" className="w-16 h-16" />
                     <p className="text-sm font-medium">暂无待处理素材</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
