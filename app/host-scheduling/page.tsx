"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type HostSchedulingResponse, type StreamerProfile } from "@/types/host-scheduling";
import { HostInputPanel } from "@/components/host-scheduling/HostInputPanel";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function HostSchedulingPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<HostSchedulingResponse | null>(null);

  const handleGenerate = async (streamers: StreamerProfile[]) => {
    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/host-scheduling/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamers }),
      });

      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      
      setResult(data.result);
      toast.success("排班策略生成完成！");
    } catch (err) {
      console.error(err);
      toast.error("策略生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen p-4 md:p-6 lg:p-8 gap-6 overflow-hidden bg-zinc-950">
      
      {/* Left Panel - Roster Input */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[380px] shrink-0 overflow-y-auto custom-scrollbar rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex flex-col"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Icon icon="lucide:calendar-check" className="text-indigo-400" />
            Host Scheduler
          </h1>
          <p className="text-sm text-zinc-400 mt-1">AI 动态利润最大化排班智能体</p>
        </div>
        
        <HostInputPanel onGenerate={handleGenerate} isGenerating={isGenerating} />
      </motion.div>

      {/* Right Panel - Schedule Output */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl relative"
      >
        {!result && !isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
            <Icon icon="lucide:clock-4" className="text-4xl mb-4 opacity-50 w-12 h-12" />
            <p>基于当前矩阵主播档案，点击生成最优排期字典</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
             <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r-2 border-purple-500 rounded-full animate-spin direction-reverse"></div>
                <Icon icon="lucide:brain-circuit" className="absolute inset-0 m-auto text-indigo-400 w-8 h-8 opacity-80" />
             </div>
             <p className="text-sm text-indigo-300 animate-pulse">正在演算千万级组合矩阵，寻找利润最优点...</p>
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full p-6 lg:p-8 overflow-y-auto custom-scrollbar"
            >
              {/* Strategy Header */}
              <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
                <div className="flex-1 bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-xl">
                  <h3 className="text-indigo-400 font-bold flex items-center gap-2 mb-2">
                    <Icon icon="lucide:target" /> 宏观策略推演 (Strategy)
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.overallStrategy}</p>
                </div>
                
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl md:w-48 shrink-0 flex flex-col items-center justify-center text-center">
                   <span className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1">Estimated GMV Boost</span>
                   <span className="text-4xl font-mono font-bold text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                     {result.estimatedGMVBoost}
                   </span>
                </div>
              </div>

              {/* Weekly Timeline view mockup */}
              <h3 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider relative flex items-center">
                 <span className="bg-zinc-950 pr-4 z-10 relative">AI 建议班表 (Assigned Slots)</span>
                 <div className="absolute w-full h-px bg-white/10 left-0 top-1/2"></div>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.schedule.map((slot, idx) => {
                  const isPeak = slot.trafficLevel === "Peak";
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={idx} 
                      className={cn(
                        "p-5 rounded-xl border relative overflow-hidden flex flex-col h-full",
                        isPeak ? "bg-purple-500/5 border-purple-500/30" : "bg-white/5 border-white/5"
                      )}
                    >
                      {isPeak && (
                         <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                           流量巅峰
                         </div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-4">
                        <Icon icon="lucide:clock" className="text-zinc-500 w-4 h-4" />
                        <span className="font-mono font-bold text-white tracking-widest">{slot.timeSlot}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 shrink-0">
                          <span className="font-bold text-lg text-white">{slot.streamerName.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500 mb-0.5">指派主播</div>
                          <div className={cn("text-base font-bold", isPeak ? "text-purple-400" : "text-zinc-200")}>
                            {slot.streamerName}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-white/5">
                        <p className="text-xs text-zinc-400 leading-relaxed italic">
                          &quot;{slot.reasoning}&quot;
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
