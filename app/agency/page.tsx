"use client";

import React from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import MagneticButton from "@/app/components/MagneticButton";
import { Badge } from "@/components/ui/badge";

const AGENTS = [
  {
    id: "style-replication",
    name: "风格复刻",
    enName: "Style Replication",
    description: "深度基因解析，完美移植大师级视觉调性，赋予产品品牌灵魂。",
    icon: "lucide:wand-sparkles",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "group-hover:border-emerald-500/50",
    href: "/agency/style-replication",
    badge: "Masterpiece",
  },
  {
    id: "set-generation",
    name: "智能组图",
    enName: "Set Generation",
    description: "从卖点分析到 3D 渲染，一键构建 1+N 全渠道商业视觉方案。",
    icon: "lucide:layout-grid",
    color: "from-blue-500/20 to-indigo-500/20",
    borderColor: "group-hover:border-blue-500/50",
    href: "/agency/set-generation",
    badge: "Beta",
  },
  {
    id: "retouch",
    name: "图片精修",
    enName: "Image Retouching",
    description: "批量背景移除、4K 高清放大、智能调色，打造工业级精修质感。",
    icon: "lucide:camera-off",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "group-hover:border-purple-500/50",
    href: "/agency/retouch",
    badge: "Batch",
  },
];

function AgentCard({ agent, index }: { agent: typeof AGENTS[0], index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.06), transparent 40%)`
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseMove={onMouseMove}
      className="group relative"
    >
      <Link href={agent.href}>
        <div className={cn(
          "relative h-[420px] rounded-[3rem] bg-white/2 border border-white/5 p-8 transition-all duration-700 hover:bg-white/5 flex flex-col justify-between overflow-hidden group-hover:border-white/20",
          agent.borderColor
        )}>
          {/* Mouse Spotlight */}
          <motion.div 
            className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background }}
          />

          {/* Background Gradient */}
          <div className={cn(
            "absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-1000 z-0",
            agent.color
          )} />
          
          {/* Glassmorphic Shine */}
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />

          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
                <Icon icon={agent.icon} className="w-8 h-8 text-white/40 group-hover:text-white transition-colors" />
              </div>
              <Badge variant="outline" className="border-white/10 text-[10px] uppercase tracking-widest font-black text-white/50">
                {agent.badge}
              </Badge>
            </div>

            <div className="space-y-2">
               <h2 className="text-2xl font-bold tracking-tight">{agent.name}</h2>
               <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{agent.enName}</p>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed">
              {agent.description}
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/5 group-hover:border-white/20 transition-colors">
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">立即进入</span>
                <Icon icon="lucide:arrow-right" className="w-5 h-5 text-emerald-500 group-hover:translate-x-2 transition-transform" />
             </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/2 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-1000" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function AgencyDashboard() {
  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-20 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl font-light tracking-tight mb-4">
              Picset AI <span className="font-semibold italic font-serif">Agency</span>
            </h1>
            <p className="text-zinc-500 max-w-2xl leading-relaxed text-sm tracking-wide">
              不仅是工具，更是您的 24/7 在线创意工作室。
              利用最前沿的生成式 AI 技术，驱动商业视觉的极致闭环。
            </p>
          </motion.div>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {AGENTS.map((agent, index) => (
            <AgentCard key={agent.id} agent={agent} index={index} />
          ))}
        </div>

        {/* Professional Workflow Comparison */}
        <div className="mt-40 space-y-16">
          <div className="text-center space-y-4">
             <h2 className="text-4xl font-light tracking-tight">Professional <span className="italic font-serif">Workflow</span></h2>
             <p className="text-zinc-500 text-sm tracking-wide">Picset AI 重新定义商业摄影的效率边界</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden">
             {/* Traditional */}
             <div className="p-12 bg-zinc-950/50 space-y-8">
                <div className="flex items-center gap-3 text-zinc-500 uppercase tracking-widest text-[10px] font-black">
                   <div className="w-2 h-2 rounded-full bg-zinc-700" />
                   传统商业拍摄 (Legacy)
                </div>
                <div className="space-y-6">
                   {[
                     { t: "策划准备", d: "寻找模特、置景、确认排期 (3-7 天)" },
                     { t: "现场拍摄", d: "摄影师、妆造、灯光团队协同 (1-2 天)" },
                     { t: "后期精修", d: "修图师逐张修饰、校色 (2-5 天)" },
                     { t: "最终产出", d: "周期间隔长，修改成本极高" }
                   ].map((item, i) => (
                     <div key={i} className="flex gap-4">
                        <div className="text-zinc-700 font-serif italic text-lg">{i + 1}.</div>
                        <div>
                           <div className="text-sm font-bold text-zinc-400">{item.t}</div>
                           <div className="text-xs text-zinc-600">{item.d}</div>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                   <span className="text-xs font-bold text-zinc-500">综合成本: High</span>
                   <span className="text-xs font-bold text-zinc-500">交付周期: 10 Days+</span>
                </div>
             </div>

             {/* Picset AI */}
             <div className="p-12 bg-white/2 relative group overflow-hidden">
                <div className="flex items-center gap-3 text-emerald-500 uppercase tracking-widest text-[10px] font-black">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                   Picset AI 自动化 (Elite)
                </div>
                <div className="space-y-6 relative z-10">
                   {[
                     { t: "基因提取", d: "AI 瞬间识别参考图美学维度 (10 Seconds)" },
                     { t: "智能合成", d: "全自动化置景与 3D 拟真渲染 (1 Minute)" },
                     { t: "实时批处理", d: "一键产出全渠道、多尺寸商业图组 (5 Minutes)" },
                     { t: "云端协作", d: "在线即时微调，支持多版本无限迭代" }
                   ].map((item, i) => (
                     <div key={i} className="flex gap-4">
                        <div className="text-emerald-500 font-serif italic text-lg opacity-40">{i + 1}.</div>
                        <div>
                           <div className="text-sm font-bold text-white/90">{item.t}</div>
                           <div className="text-xs text-zinc-500">{item.d}</div>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="pt-8 border-t border-white/10 flex items-center justify-between relative z-10">
                   <span className="text-xs font-bold text-white/60">综合成本: Low (-80%)</span>
                   <span className="text-xs font-bold text-emerald-400">交付周期: 1 Day</span>
                </div>
                {/* Decorative background for the AI side */}
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
             </div>
          </div>
        </div>

        {/* Footer/CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-32 p-12 rounded-[4rem] bg-zinc-900/50 border border-white/5 text-center space-y-8 relative overflow-hidden"
        >
          <div className="relative z-10 space-y-4">
            <h3 className="text-3xl font-light">准备好重塑您的 <span className="italic font-serif">Brand Identity</span> 吗？</h3>
            <p className="text-zinc-500 text-sm max-w-xl mx-auto">
              Picset Pro 用户专享无限次 API 调用、云端素材存储与 4K 企业级画质。
            </p>
            <div className="pt-4 flex justify-center">
               <Link href="/pricing">
                 <MagneticButton className="px-12 h-14 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform">
                    升级企业方案 (PRO)
                 </MagneticButton>
               </Link>
            </div>
          </div>
          {/* Subtle Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none" />
        </motion.div>
      </div>
    </div>
  );
}
