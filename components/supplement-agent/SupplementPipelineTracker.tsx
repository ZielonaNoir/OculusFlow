"use client";

import React from "react";
import { type SupplementAgentPhase } from "@/types/supplement";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

interface TrackerProps {
  currentPhase: SupplementAgentPhase;
}

const steps = [
  { phase: "ingredient_analysis", icon: "lucide:microscope", title: "1. 成分解析", desc: "Agent 1: 提取成分功效" },
  { phase: "audience_insight", icon: "lucide:users", title: "2. 人群洞察", desc: "Agent 2: 健康心理建模" },
  { phase: "benefit_translation", icon: "lucide:arrow-right-left", title: "3. 利益转化", desc: "Agent 3: 参数→人话翻译" },
  { phase: "compliance_review", icon: "lucide:shield-check", title: "4. 合规质检", desc: "Agent 4: 广告法审核" },
];

export function SupplementPipelineTracker({ currentPhase }: TrackerProps) {
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
                  ${isActive ? "bg-teal-500/20 border-teal-500 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.5)]" :
                    isPast ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                    "bg-black/40 border-zinc-800 text-zinc-600"}`}
                animate={isActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
              >
                <Icon icon={isPast ? "lucide:check" : step.icon} className="h-5 w-5" />
              </motion.div>

              <div className="mt-3 text-center">
                <p className={`text-sm font-bold ${isActive || isPast ? "text-white" : "text-zinc-500"}`}>{step.title}</p>
                <p className="text-[10px] text-zinc-500 mt-1 hidden md:block">{step.desc}</p>
              </div>

              {/* Connector */}
              {idx < steps.length - 1 && (
                <div className="absolute top-6 left-[60%] w-[80%] h-[2px] -z-10 bg-zinc-800">
                  <motion.div
                    className="h-full bg-linear-to-r from-teal-500 to-emerald-500"
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

      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-center text-emerald-400 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Icon icon="lucide:shield-check" className="h-5 w-5" />
            保健品四层智能体审核完毕 — 合规全案已就绪
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
