"use client";

import React from "react";
import { type MultiAgentPhase } from "@/types/apparel";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";

interface TrackerProps {
  currentPhase: MultiAgentPhase;
}

const steps = [
  { phase: "vision_analysis", icon: "lucide:eye", title: "1. 视觉提取", desc: "Agent 1: 解析物理卖点" },
  { phase: "psychological_insight", icon: "lucide:brain", title: "2. 心理洞察", desc: "Agent 2: 分析人群痛点" },
  { phase: "copywriting", icon: "lucide:pen-tool", title: "3. 降维翻译", desc: "Agent 3: 策划核心买点" },
  { phase: "quality_review", icon: "lucide:gavel", title: "4. 专家质检", desc: "Agent 4: 审查与打回" }
];

export function AgentPipelineTracker({ currentPhase }: TrackerProps) {
  if (currentPhase === "idle" || currentPhase === "failed") return null;

  const currentIndex = steps.findIndex(s => s.phase === currentPhase);
  const isCompleted = currentPhase === "completed";

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isPast = isCompleted || currentIndex > idx;
          
          return (
            <div key={idx} className="flex flex-col items-center relative z-10 w-1/4">
              <motion.div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500
                  ${isActive ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 
                    isPast ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 
                    'bg-black/40 border-zinc-800 text-zinc-600'}`
                }
                animate={isActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
              >
                <Icon icon={isPast ? "lucide:check" : step.icon} className="h-5 w-5" />
              </motion.div>
              
              <div className="mt-3 text-center">
                <p className={`text-sm font-bold ${isActive || isPast ? 'text-white' : 'text-zinc-500'}`}>{step.title}</p>
                <p className="text-[10px] text-zinc-500 mt-1 hidden md:block">{step.desc}</p>
              </div>

              {/* Connecting Line */}
              {idx < steps.length - 1 && (
                <div className="absolute top-6 left-[60%] w-[80%] h-[2px] -z-10 bg-zinc-800">
                   <motion.div 
                     className="h-full bg-linear-to-r from-indigo-500 to-purple-500"
                     initial={{ width: "0%" }}
                     animate={{ width: isPast ? "100%" : isActive ? "50%" : "0%" }}
                     transition={{ duration: 1 }}
                   />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isCompleted && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center text-emerald-400 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Icon icon="lucide:check-circle-2" className="h-5 w-5" />
          多智能体流水线协同完成，输出标准作业 SOP
        </motion.div>
      )}
    </div>
  );
}
