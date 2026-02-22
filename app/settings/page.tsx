import { SettingsPanel } from "@/components/oculus-flow/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            设置
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            配置 AI 模型和 API 连接参数
          </p>
        </div>

        <SettingsPanel />
      </div>
    </div>
  );
}
