"use client";

import { LayoutTemplate, Plus, Clock } from "lucide-react";
import { Icon } from "@iconify/react";

export default function DashboardRecentFiles() {
  return (
    <div className="w-full max-w-5xl mx-auto mt-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-zinc-200 flex items-center gap-2">
          <Clock className="w-5 h-5 text-zinc-400" />
          Recently Opened
        </h2>
        <button className="text-sm text-zinc-400 hover:text-white transition-colors">
          View all
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Quick Create: Empty State 1 */}
        <div className="group relative h-48 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300">New Script</h3>
          <p className="text-xs text-zinc-500 mt-1">Start from scratch</p>
        </div>

        {/* Quick Create: Empty State 2 */}
        <div className="group relative h-48 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <LayoutTemplate className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300">New Space</h3>
          <p className="text-xs text-zinc-500 mt-1">From template</p>
        </div>

        {/* Recent Item 1 */}
        <div className="group relative h-48 rounded-2xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-800/60 backdrop-blur-sm transition-all cursor-pointer overflow-hidden flex flex-col">
          <div className="flex-1 bg-linear-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
             <Icon icon="solar:camera-minimalistic-bold-duotone" className="w-12 h-12 text-blue-400/50" />
          </div>
          <div className="p-4 border-t border-white/5 bg-zinc-950/50">
            <h3 className="text-sm font-medium text-zinc-200 truncate">秋季新品裙装拍摄</h3>
            <p className="text-xs text-zinc-500 mt-1">Edited 2 hours ago</p>
          </div>
        </div>

        {/* Recent Item 2 */}
        <div className="group relative h-48 rounded-2xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-800/60 backdrop-blur-sm transition-all cursor-pointer overflow-hidden flex flex-col">
          <div className="flex-1 bg-linear-to-br from-emerald-900/20 to-teal-900/20 flex items-center justify-center">
             <Icon icon="solar:gallery-bold-duotone" className="w-12 h-12 text-emerald-400/50" />
          </div>
          <div className="p-4 border-t border-white/5 bg-zinc-950/50">
            <h3 className="text-sm font-medium text-zinc-200 truncate">主图背景拓展A/B测试</h3>
            <p className="text-xs text-zinc-500 mt-1">Edited yesterday</p>
          </div>
        </div>

      </div>
    </div>
  );
}
