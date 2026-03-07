"use client";

import { AutoCutWorkspace } from "@/components/auto-cut/AutoCutWorkspace";

export default function AutoCutPage() {
  return (
    <div className="space-y-4 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Auto-Cut</h1>
        <p className="mt-1 text-sm text-zinc-400">
          输入文案，自动完成经典台词映射、素材检索、配音、字幕和混剪成片。
        </p>
      </div>
      <AutoCutWorkspace />
    </div>
  );
}
