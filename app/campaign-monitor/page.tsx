"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { type CampaignMetric, type ActionLog } from "@/types/campaign-monitor";
import { CampaignDashboard } from "@/components/campaign-monitor/CampaignDashboard";
import { Icon } from "@iconify/react";
import MagneticButton from "@/app/components/MagneticButton";

const INITIAL_METRICS: CampaignMetric[] = [{
  timestamp: "00:00:00",
  spend: 50,
  revenue: 120,
  roi: 2.4,
  cpc: 0.8,
  status: "running"
}];

export default function CampaignMonitorPage() {
  const [metrics, setMetrics] = useState<CampaignMetric[]>(INITIAL_METRICS);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
  }, []);

  const tickSimulation = useCallback(async () => {
    try {
      const response = await fetch("/api/campaign-monitor/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMetrics: metrics }),
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(prev => [...prev.slice(-100), data.metric]); // Keep last 100 max
        if (data.log) {
          setLogs(prev => [...prev, data.log]);
        }
        
        if (data.metric.status === "paused") {
          stopSimulation();
        }
      }
    } catch (e) {
      console.error(e);
      stopSimulation();
    }
  }, [metrics, stopSimulation]);

  const startSimulation = () => {
    setIsSimulating(true);
    // Clear old state except a fresh start
    setMetrics(INITIAL_METRICS);
    setLogs([{
      id: "init1",
      timestamp: "00:00:00",
      level: "info",
      message: "AI 安全员已上线。接管午夜时段投流计划监控权限。",
      actionTaken: "加载历史模型与底线止损阈值(ROI < 1.0)。开始监听数据流..."
    }]);
  };

  useEffect(() => {
    if (isSimulating) {
      simulationRef.current = setInterval(() => {
        tickSimulation();
      }, 2500); // Fetch new tick every 2.5s
    } else if (simulationRef.current) {
      clearInterval(simulationRef.current);
    }
    
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [isSimulating, tickSimulation]);

  return (
    <div className="flex flex-col h-screen p-4 md:p-6 lg:p-8 gap-6 overflow-hidden bg-zinc-950">
      
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Icon icon="lucide:radar" className="text-emerald-400" />
            AI 投流盯盘监控中心
          </h1>
          <p className="text-sm text-zinc-400 mt-1">24小时无人值守，算法防跌破熔断技术</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
             <Icon icon="lucide:cpu" />
             AI Engine: DeepSeek-Volcengine (Active)
          </div>
          
          <MagneticButton
            onClick={isSimulating ? stopSimulation : startSimulation}
            className={`px-6 h-10 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSimulating ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isSimulating ? (
              <><Icon icon="lucide:square" className="w-4 h-4" /> 终止接管</>
            ) : (
              <><Icon icon="lucide:play" className="w-4 h-4" /> 授权 AI 接管盘面</>
            )}
          </MagneticButton>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-transparent relative">
        {!isSimulating && metrics.length === 1 && logs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl">
             <Icon icon="lucide:shield-check" className="w-16 h-16 text-zinc-700 mb-4" />
             <p className="text-zinc-500 font-bold text-lg">系统待命中 (Standby)</p>
             <p className="text-sm text-zinc-600 mt-2">点击右上角“授权 AI 接管”开始模拟实时盘面盯盘</p>
          </div>
        ) : (
          <CampaignDashboard metrics={metrics} logs={logs} />
        )}
      </div>

    </div>
  );
}
