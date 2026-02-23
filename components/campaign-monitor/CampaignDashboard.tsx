"use client";

import React, { useEffect, useRef } from "react";
import { type CampaignMetric, type ActionLog } from "@/types/campaign-monitor";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CampaignDashboardProps {
  metrics: CampaignMetric[];
  logs: ActionLog[];
}

export function CampaignDashboard({ metrics, logs }: CampaignDashboardProps) {
  const current = metrics[metrics.length - 1];
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!current) return null;

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <MetricCard title="总消耗 (Spend)" value={`¥${current.spend}`} prefix="lucide:banknote" trend={current.spend - (metrics[metrics.length - 2]?.spend || current.spend)} inverted />
        <MetricCard title="总营收 (GMV)" value={`¥${current.revenue}`} prefix="lucide:shopping-bag" trend={current.revenue - (metrics[metrics.length - 2]?.revenue || current.revenue)} />
        <MetricCard title="实时投产比 (ROI)" value={current.roi.toString()} prefix="lucide:arrow-up-right" 
          statusColor={current.roi > 2.0 ? "text-emerald-400" : current.roi < 1.0 ? "text-red-400" : "text-zinc-200"} />
        <MetricCard title="单次点击成本 (CPC)" value={`¥${current.cpc.toFixed(2)}`} prefix="lucide:mouse-pointer-click" inverted />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Chart/Metrics Visualization Mock */}
        <div className="flex-1 bg-black/40 border border-white/5 p-6 rounded-2xl flex flex-col min-h-0 relative overflow-hidden">
           <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
             <Icon icon="lucide:activity" className="text-indigo-400" />
             实时投放趋势监控
           </h3>
           
           <div className="flex-1 flex items-end gap-1 overflow-hidden opacity-50 relative bottom-0">
              {metrics.slice(-40).map((m, i) => (
                <motion.div 
                  key={m.timestamp + i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.min(100, (m.roi / 5) * 100)}%` }}
                  className={cn(
                    "flex-1 rounded-t-sm w-full min-w-[8px]",
                    m.roi > 2.5 ? "bg-emerald-500" : m.roi < 1.0 ? "bg-red-500" : "bg-indigo-500"
                  )}
                />
              ))}
           </div>
           
           {/* Overlay status */}
           {current.status === "paused" && (
             <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex items-center justify-center flex-col z-20">
               <Icon icon="lucide:shield-alert" className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
               <h2 className="text-2xl font-bold text-white tracking-widest uppercase">系统熔断保护触发</h2>
               <p className="text-red-200 mt-2">消耗超标且转化低迷，已强行切断预算防止跑飞</p>
             </div>
           )}
        </div>

        {/* Right: AI Action Logs */}
        <div className="w-full lg:w-[450px] bg-zinc-950 border border-white/10 rounded-2xl flex flex-col shrink-0 min-h-0 relative overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 shrink-0 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Icon icon="lucide:terminal" className="text-zinc-400" />
              AI 安全员行动日志
            </h3>
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  className="bg-black/40 border border-white/5 rounded-lg p-3"
                >
                   <div className="flex items-center gap-2 mb-2 text-xs font-mono">
                     <span className="text-zinc-500">{log.timestamp}</span>
                     <LogStatusBadge level={log.level} />
                   </div>
                   <p className="text-sm text-zinc-300 leading-relaxed max-w-[95%]">{log.message}</p>
                   <div className="mt-3 pt-2 border-t border-white/5 flex gap-2 items-start">
                     <Icon icon="lucide:bot" className="text-indigo-400 w-4 h-4 mt-0.5 shrink-0" />
                     <p className="text-xs text-indigo-300 font-medium">{log.actionTaken}</p>
                   </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  prefix: string;
  statusColor?: string;
  trend?: number;
  inverted?: boolean;
}

function MetricCard({ title, value, prefix, statusColor = "text-white", trend, inverted = false }: MetricCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col">
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2">
        <Icon icon={prefix} className="text-zinc-400" /> {title}
      </div>
      <div className={`text-2xl md:text-3xl font-mono font-bold ${statusColor}`}>{value}</div>
      {trend !== undefined && (
        <div className={`text-[10px] mt-2 font-bold flex items-center gap-1
          ${trend > 0 ? (inverted ? 'text-red-400' : 'text-emerald-400') : trend < 0 ? (inverted ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}
        >
          <Icon icon={trend > 0 ? "lucide:trending-up" : trend < 0 ? "lucide:trending-down" : "lucide:minus"} />
          {Math.abs(trend).toFixed(2)} vs last tick
        </div>
      )}
    </div>
  );
}

function LogStatusBadge({ level }: { level: string }) {
  switch (level) {
    case 'critical':
      return <span className="text-[10px] px-2 py-0.5 rounded-sm bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">Critical</span>;
    case 'warning':
      return <span className="text-[10px] px-2 py-0.5 rounded-sm bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">Warning</span>;
    case 'success':
      return <span className="text-[10px] px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">Scale</span>;
    default:
      return <span className="text-[10px] px-2 py-0.5 rounded-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">Info</span>;
  }
}
