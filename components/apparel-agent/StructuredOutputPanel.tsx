"use client";

import React from "react";
import { type ApparelResponse } from "@/types/apparel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";

interface OutputPanelProps {
  data: ApparelResponse;
}

export function StructuredOutputPanel({ data }: OutputPanelProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 rounded-2xl p-6 overflow-hidden">
      <div className="mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon icon="lucide:file-check" className="text-emerald-400" />
            全案策划报告
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Multi-Agent Generated SOP</p>
        </div>
      </div>
      
      <Tabs defaultValue="copywriting" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-white/5 border border-white/10 w-full justify-start rounded-xl p-1 shrink-0 flex-wrap h-auto">
          <TabsTrigger value="copywriting" className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
            <Icon icon="lucide:pen-tool" className="mr-2 h-4 w-4" /> 卖点策划
          </TabsTrigger>
          <TabsTrigger value="visual" className="rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Icon icon="lucide:image" className="mr-2 h-4 w-4" /> 主图与排版
          </TabsTrigger>
          <TabsTrigger value="ops" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Icon icon="lucide:message-square" className="mr-2 h-4 w-4" /> 评价与客服库
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-2">
          
          {/* TAB 1: Copywriting */}
          <TabsContent value="copywriting" className="m-0 space-y-6 animate-in fade-in duration-500">
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">核心买点 (降维翻译后)</h3>
              <div className="grid gap-4">
                {data.sellingPoints.map((sp, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white leading-tight">{sp.title}</h4>
                        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{sp.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">细分生活场景</h3>
              <div className="flex flex-wrap gap-2">
                {data.scenarios.map((scene, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
                    <Icon icon="lucide:map-pin" className="inline mr-1 text-zinc-500" /> {scene}
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Visual & Layout */}
          <TabsContent value="visual" className="m-0 space-y-6 animate-in fade-in duration-500">
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">主图设计规范 (5张)</h3>
              <div className="space-y-3">
                {data.mainImages.map((img) => (
                  <div key={img.index} className="flex items-stretch gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="w-12 h-12 rounded bg-black flex items-center justify-center font-mono text-xl text-zinc-600 border border-zinc-800 shrink-0">
                      {img.index}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{img.concept}</span>
                      <p className="text-sm text-white mt-1">{img.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">详情页长图结构推演</h3>
              <div className="relative border-l-2 border-zinc-800 ml-3 space-y-6 pb-4">
                {data.longPageStructure.map((sec, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[7px] top-1.5 ring-4 ring-zinc-950" />
                    <h4 className="text-sm font-bold text-white">{sec.section}</h4>
                    <p className="text-sm text-zinc-400 mt-1 bg-black/40 p-3 rounded-lg border border-white/5">{sec.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Operations & CS */}
          <TabsContent value="ops" className="m-0 space-y-8 animate-in fade-in duration-500">
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">买家秀评价库 (10组人设素材)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.reviews.map((rev, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 relative">
                    <Icon icon="lucide:quote" className="absolute top-3 right-3 h-8 w-8 text-white/5" />
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Icon icon="lucide:user" className="h-3 w-3 text-emerald-500" />
                       </div>
                       <span className="text-xs font-medium text-emerald-400">{rev.persona}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed italic">&quot;{rev.content}&quot;</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">问大家 Q&A 官方话术</h3>
              <div className="space-y-3">
                {data.qna.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex gap-3 text-sm">
                      <span className="font-bold text-orange-400 shrink-0">Q:</span>
                      <span className="font-medium text-white">{item.question}</span>
                    </div>
                    <div className="flex gap-3 text-sm mt-3 pt-3 border-t border-white/5">
                      <span className="font-bold text-emerald-400 shrink-0">A:</span>
                      <span className="text-zinc-400">{item.answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
        </div>
      </Tabs>
    </div>
  );
}
