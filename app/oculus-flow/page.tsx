"use client";

import { Icon } from "@iconify/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OculusVideoWorkspace } from "@/components/oculus-flow/OculusVideoWorkspace";
import { LegacyOculusFlowWorkspace } from "@/components/oculus-flow/LegacyOculusFlowWorkspace";

export default function OculusFlowPage() {
  return (
    <div className="space-y-4 p-6 md:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Oculus Flow</h1>
          <p className="mt-1 text-sm text-zinc-400">
            剧本驱动的视频工作流已并入当前页面，旧版详情页方案生成保留在 Legacy 标签。
          </p>
        </div>
      </div>

      <Tabs defaultValue="video-workflow" className="space-y-4">
        <TabsList className="border border-white/10 bg-black/30 p-1 text-zinc-200">
          <TabsTrigger
            value="video-workflow"
            className="gap-2 rounded-md text-zinc-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Icon icon="lucide:clapperboard" className="h-4 w-4" />
            AI Video Workflow
          </TabsTrigger>
          <TabsTrigger
            value="legacy"
            className="gap-2 rounded-md text-zinc-200 data-[state=active]:bg-zinc-100 data-[state=active]:text-black"
          >
            <Icon icon="lucide:layout-template" className="h-4 w-4" />
            Legacy Detail Page
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video-workflow" className="m-0">
          <OculusVideoWorkspace />
        </TabsContent>
        <TabsContent value="legacy" className="m-0">
          <LegacyOculusFlowWorkspace />
        </TabsContent>
      </Tabs>
    </div>
  );
}
