"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getModelPrice } from "@/lib/pricing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface Model {
  id: string;
  display_name: string;
  owned_by: string;
}

interface ModelsResponse {
  models: Model[];
  configured: boolean;
  error?: string;
  message?: string;
  total?: number;
}

const STORAGE_KEY_TEXT = "oculus_text_model";
const STORAGE_KEY_IMAGE = "oculus_image_model";

const DEFAULT_IMAGE_MODELS = [
  {
    id: "doubao-seedream-4-5-251128",
    display_name: "即梦 4.5",
    subtitle: "图文匹配度最高，美感强，推荐",
  },
  {
    id: "doubao-seedream-4-0-250828",
    display_name: "即梦 4.0",
    subtitle: "支持多参考图，系列组图生成",
  },
  {
    id: "doubao-seedream-3-0-t2i-250415",
    display_name: "即梦 3.0",
    subtitle: "海报排版强化，文字准确性高",
  },
];

export function SettingsPanel() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTextModel, setSelectedTextModel] = useState<string>("");
  const [selectedImageModel, setSelectedImageModel] = useState<string>(
    DEFAULT_IMAGE_MODELS[0].id
  );
  const [saved, setSaved] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/oculus/models");
      const data: ModelsResponse = await res.json();
      setModels(data.models || []);
      setConfigured(data.configured);
      if (data.error) setError(data.error);
    } catch {
      setError("无法连接到 API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    // Load saved preferences
    const savedText = localStorage.getItem(STORAGE_KEY_TEXT);
    const savedImage = localStorage.getItem(STORAGE_KEY_IMAGE);
    if (savedText) setSelectedTextModel(savedText);
    if (savedImage) setSelectedImageModel(savedImage);
  }, [fetchModels]);

  // Auto-select first model when models load
  useEffect(() => {
    if (models.length > 0 && !selectedTextModel) {
      setSelectedTextModel(models[0].id);
    }
  }, [models, selectedTextModel]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY_TEXT, selectedTextModel);
    localStorage.setItem(STORAGE_KEY_IMAGE, selectedImageModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderModelCard = (model: Model, color: "blue" | "teal" | "purple" | "amber") => {
    const isSelected = selectedTextModel === model.id;
    const colors = {
      blue: {
        border: "border-blue-500/40",
        bg: "bg-blue-950/30",
        radio: "border-blue-400 bg-blue-400",
        icon: "text-blue-400",
        shadow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
      },
      teal: {
        border: "border-teal-500/40",
        bg: "bg-teal-950/30",
        radio: "border-teal-400 bg-teal-400",
        icon: "text-teal-400",
        shadow: "shadow-[0_0_15px_rgba(20,184,166,0.3)]",
      },
      purple: {
        border: "border-purple-500/40",
        bg: "bg-purple-950/30",
        radio: "border-purple-400 bg-purple-400",
        icon: "text-purple-400",
        shadow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
      },
      amber: {
        border: "border-amber-500/40",
        bg: "bg-amber-950/30",
        radio: "border-amber-400 bg-amber-400",
        icon: "text-amber-400",
        shadow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
      },
    };
    const c = colors[color];
    const priceInfo = getModelPrice(model.id, model.display_name);

    return (
      <motion.label
        key={model.id}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all duration-300",
          isSelected
            ? `${c.border} ${c.bg} ${c.shadow}`
            : "border-white/5 bg-white/3 hover:border-white/10 hover:bg-white/5"
        )}
      >
        <input
          type="radio"
          name="textModel"
          value={model.id}
          checked={isSelected}
          onChange={() => setSelectedTextModel(model.id)}
          className="sr-only"
        />
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            isSelected ? c.radio : "border-zinc-600"
          )}
        >
          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
        <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white flex items-center gap-2">
              {model.display_name}
              {priceInfo && (
                <span className="inline-flex rounded bg-white/10 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-zinc-300 font-mono sm:hidden">
                  {priceInfo.in} / {priceInfo.out} 元
                </span>
              )}
            </p>
            <p className="truncate text-xs text-zinc-500 font-mono mt-0.5">
              {model.id}
            </p>
          </div>
          
          {/* Detailed Pricing Data on larger screens */}
          {priceInfo && (
             <div className="hidden sm:flex col-span-1 lg:col-span-2 items-center gap-4 text-[11px] text-zinc-400 font-mono md:justify-end pr-2 opacity-80 transition-opacity hover:opacity-100">
               <div className="flex items-center gap-1.5">
                  <Icon icon="lucide:arrow-down-to-line" className="h-3.5 w-3.5 text-zinc-500" />
                  <span>输入: {priceInfo.in} 元 / K</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <Icon icon="lucide:arrow-up-from-line" className="h-3.5 w-3.5 text-zinc-500" />
                  <span>输出: {priceInfo.out} 元 / K</span>
               </div>
             </div>
          )}
        </div>
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Icon
                icon="lucide:check-circle-2"
                className={cn("h-5 w-5 shrink-0", c.icon)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.label>
    );
  };

  return (
    <div className="space-y-8">
      {/* API Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
          configured
            ? "border-emerald-500/20 bg-emerald-950/30 text-emerald-300"
            : "border-amber-500/20 bg-amber-950/30 text-amber-300"
        )}
      >
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            configured ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"
          )}
        />
        {configured ? (
          <span>
            <strong>API 已连接</strong> — VOLCENGINE_API_KEY 已配置
          </span>
        ) : (
          <span>
            <strong>API 未配置</strong> — 请在{" "}
            <code className="rounded bg-amber-900/40 px-1.5 py-0.5 font-mono text-xs">
              .env.local
            </code>{" "}
            中设置 VOLCENGINE_API_KEY
          </span>
        )}
      </motion.div>

      {/* Text Model Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">文本生成模型</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              用于生成详情页文案和图片 Prompt
            </p>
          </div>
          <button
            onClick={fetchModels}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <Icon
              icon="lucide:refresh-cw"
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            刷新
          </button>
        </div>

        {loading ? (
          <div className="h-12 w-full animate-pulse rounded-xl bg-white/5" />
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-400">
            <Icon icon="lucide:alert-circle" className="mb-1 h-4 w-4" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <Tabs defaultValue="pro" className="w-full">
              <TabsList className="bg-black/40 border border-white/10 w-full justify-start rounded-xl p-1 shrink-0 flex-wrap h-auto mb-4">
                <TabsTrigger value="pro" className="rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
                  <Icon icon="lucide:brain" className="mr-2 h-4 w-4" /> Doubao Pro
                </TabsTrigger>
                <TabsTrigger value="lite" className="rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors data-[state=active]:bg-teal-600/20 data-[state=active]:text-teal-400">
                  <Icon icon="lucide:zap" className="mr-2 h-4 w-4" /> Doubao Lite
                </TabsTrigger>
                <TabsTrigger value="special" className="rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
                  <Icon icon="lucide:blocks" className="mr-2 h-4 w-4" /> 扩展能力
                </TabsTrigger>
                <TabsTrigger value="other" className="rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
                  <Icon icon="lucide:globe" className="mr-2 h-4 w-4" /> 开源矩阵
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pro" className="m-0 space-y-2">
                {models.filter(m => m.id.includes("doubao-pro") && !m.id.match(/(embedding|browsing|character|functioncall|vision)/)).map(m => renderModelCard(m, "blue"))}
              </TabsContent>
              
              <TabsContent value="lite" className="m-0 space-y-2">
                {models.filter(m => m.id.includes("doubao-lite") && !m.id.match(/(embedding|browsing|character|functioncall|vision)/)).map(m => renderModelCard(m, "teal"))}
              </TabsContent>
              
              <TabsContent value="special" className="m-0 space-y-2">
                {models.filter(m => m.id.match(/(embedding|browsing|character|functioncall|vision)/)).map(m => renderModelCard(m, "purple"))}
              </TabsContent>
              
              <TabsContent value="other" className="m-0 space-y-2">
                {models.filter(m => !m.id.includes("doubao")).map(m => renderModelCard(m, "amber"))}
              </TabsContent>
            </Tabs>
            <p className="text-xs text-zinc-500 mt-4 flex items-center gap-1.5"><Icon icon="lucide:info" className="h-3.5 w-3.5"/> 推荐优先使用 Pro 结尾的模型保障多阶智能体的推理智商分布，处理并发小任务时推荐使用 Lite 降低成本。</p>
          </div>
        )}
      </section>

      {/* Image Model Section */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">图像生成模型</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            豆包 Seedream — 即梦 AI 系列，走 Ark API
          </p>
        </div>
        <div className="space-y-2">
          {DEFAULT_IMAGE_MODELS.map((model) => (
            <motion.label
              key={model.id}
              whileHover={{ scale: 1.005 }}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
                selectedImageModel === model.id
                  ? "border-violet-500/40 bg-violet-950/30"
                  : "border-white/5 bg-white/3 hover:border-white/10 hover:bg-white/5"
              )}
            >
              <input
                type="radio"
                name="imageModel"
                value={model.id}
                checked={selectedImageModel === model.id}
                onChange={() => setSelectedImageModel(model.id)}
                className="sr-only"
              />
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  selectedImageModel === model.id
                    ? "border-violet-400 bg-violet-400"
                    : "border-zinc-600"
                )}
              >
                {selectedImageModel === model.id && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {model.display_name}
                </p>
                <p className="text-xs text-zinc-500">{model.subtitle}</p>
              </div>
              {selectedImageModel === model.id && (
                <Icon
                  icon="lucide:check-circle-2"
                  className="h-4 w-4 shrink-0 text-violet-400"
                />
              )}
            </motion.label>
          ))}
        </div>
      </section>

      {/* Endpoint Config Hint */}
      <section className="rounded-xl border border-white/5 bg-white/3 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon icon="lucide:key-round" className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Endpoint 配置说明</h3>
        </div>
        <div className="space-y-2 text-xs text-zinc-400">
          <p>
            <span className="text-zinc-300 font-medium">DOUBAO_ENDPOINT_ID</span>{" "}
            需要是 Ark 推理接入点 ID，格式为{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-blue-400">
              ep-20250218xxxxxxxx-xxxxx
            </code>
          </p>
          <p>
            获取地址：
            <a
              href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-blue-400 underline underline-offset-2 hover:text-blue-300"
            >
              方舟控制台 → 在线推理
            </a>
          </p>
          <div className="mt-3 rounded-lg bg-black/40 p-3 font-mono">
            <p className="text-zinc-500"># .env.local</p>
            <p className="text-emerald-400">VOLCENGINE_API_KEY=your-api-key</p>
            <p className="text-emerald-400">DOUBAO_ENDPOINT_ID=ep-20250218xxxxxxxx-xxxxx</p>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <motion.button
        onClick={handleSave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="relative w-full overflow-hidden rounded-xl border border-blue-400/20 bg-linear-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
      >
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.span
              key="saved"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-2"
            >
              <Icon icon="lucide:check" className="h-4 w-4" />
              已保存到本地
            </motion.span>
          ) : (
            <motion.span
              key="save"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-2"
            >
              <Icon icon="lucide:save" className="h-4 w-4" />
              保存配置
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
