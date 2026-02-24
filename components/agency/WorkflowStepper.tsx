"use client";

import React from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  subLabel?: string;
  icon?: string;
}

interface WorkflowStepperProps {
  steps: Step[];
  currentStepIndex: number;
  className?: string;
}

export function WorkflowStepper({
  steps,
  currentStepIndex,
  className,
}: WorkflowStepperProps) {
  return (
    <div className={cn("w-full py-8", className)}>
      <div className="relative flex justify-between">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 z-0" />
        
        {/* Progress Line */}
        <motion.div
          className="absolute top-1/2 left-0 h-[2px] bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] -translate-y-1/2 z-0"
          initial={{ width: "0%" }}
          animate={{
            width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const isPending = idx > currentStepIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              {/* Step Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isCompleted ? "#10b981" : isActive ? "#ffffff" : "#0a0a0a",
                  borderColor: isCompleted ? "#10b981" : isActive ? "#ffffff" : "rgba(255,255,255,0.1)",
                }}
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors duration-500 backdrop-blur-md",
                  isActive && "shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                )}
              >
                {isCompleted ? (
                  <Icon icon="lucide:check" className="w-5 h-5 text-black" />
                ) : (
                  <span className={cn(
                    "text-xs font-bold",
                    isActive ? "text-black" : "text-white/40"
                  )}>
                    {idx + 1}
                  </span>
                )}
              </motion.div>

              {/* Labels */}
              <div className="absolute top-14 flex flex-col items-center min-w-[120px]">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                  isActive ? "text-white" : "text-white/30"
                )}>
                  {step.label}
                </span>
                {step.subLabel && isActive && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] text-zinc-500 mt-1"
                  >
                    {step.subLabel}
                  </motion.span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
