"use client";

import React, { useState } from "react";
import { type StreamerProfile } from "@/types/host-scheduling";
import { Icon } from "@iconify/react";
import MagneticButton from "@/app/components/MagneticButton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

const initialStreamers: StreamerProfile[] = [
  { id: "s1", name: "安娜 (Top)", tags: ["高转化", "成熟稳重"], conversionRate: 5.2, avgTicketSize: 180, maxHours: 4 },
  { id: "s2", name: "CC (Mid)", tags: ["亲和力", "互动好"], conversionRate: 3.8, avgTicketSize: 120, maxHours: 6 },
  { id: "s3", name: "Leo (Night)", tags: ["抗熬夜", "男主播"], conversionRate: 2.5, avgTicketSize: 90, maxHours: 8 },
  { id: "s4", name: "林林 (New)", tags: ["形象好", "新手"], conversionRate: 1.8, avgTicketSize: 85, maxHours: 4 },
];

interface HostInputPanelProps {
  onGenerate: (streamers: StreamerProfile[]) => void;
  isGenerating: boolean;
}

export function HostInputPanel({ onGenerate, isGenerating }: HostInputPanelProps) {
  const [streamers] = useState<StreamerProfile[]>(initialStreamers);
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // In a real app we'd have editable forms, for now we just show the active roster
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(streamers);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">可用主播矩阵囊括 (Roster)</h3>
        
        <div className="space-y-3">
          {streamers.map((s, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <span className="font-bold text-white text-sm">{s.name}</span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  {s.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-black/40 text-zinc-400 border border-white/5">{t}</span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-black/30 rounded p-2 text-center">
                  <div className="text-[10px] text-zinc-500">转化率</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">{s.conversionRate}%</div>
                </div>
                <div className="bg-black/30 rounded p-2 text-center">
                  <div className="text-[10px] text-zinc-500">客单价</div>
                  <div className="text-xs font-mono font-bold text-orange-400">¥{s.avgTicketSize}</div>
                </div>
                <div className="bg-black/30 rounded p-2 text-center">
                  <div className="text-[10px] text-zinc-500">体力上限</div>
                  <div className="text-xs font-mono font-bold text-zinc-300">{s.maxHours}h</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
           <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:calendar-clock" className="text-zinc-400" />
              <span className="text-sm text-zinc-300">目标排班日期</span>
           </div>
           <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
             <PopoverTrigger asChild>
               <Button
                 variant="outline"
                 className={cn(
                   "w-full justify-start text-left font-normal bg-black/30 border-white/10 text-white hover:bg-white/5 hover:text-white",
                   !targetDate && "text-zinc-500"
                 )}
               >
                 <Icon icon="lucide:calendar" className="mr-2 h-4 w-4 text-zinc-400" />
                 {targetDate ? format(targetDate, "yyyy年M月d日 (EEEE)", { locale: zhCN }) : <span className="text-zinc-500">选择日期</span>}
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
               <Calendar
                 mode="single"
                 selected={targetDate}
                 onSelect={(d) => { if (d) { setTargetDate(d); setCalendarOpen(false); } }}
                 disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                 locale={zhCN}
                 initialFocus
               />
             </PopoverContent>
           </Popover>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <MagneticButton
          type="submit"
          disabled={isGenerating}
          className={`w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
            ${isGenerating ? 'bg-indigo-500/50 text-white/50 cursor-not-allowed' : 'bg-linear-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-indigo-500/25'}`}
        >
          {isGenerating ? (
            <>
              <Icon icon="lucide:loader-2" className="h-5 w-5 animate-spin" />
              AI 仿真推演排班中...
            </>
          ) : (
            <>
              <Icon icon="lucide:cpu" className="h-5 w-5" />
              生成利润最大化排期表
            </>
          )}
        </MagneticButton>
      </div>
    </form>
  );
}
