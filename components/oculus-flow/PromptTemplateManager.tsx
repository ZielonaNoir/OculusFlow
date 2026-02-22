"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  moduleType: string;
  prompt: string;
  isBuiltIn?: boolean;
  createdAt?: number;
}

interface PromptTemplateManagerProps {
  /** Called when user clicks "Apply" on a template */
  onApply?: (template: PromptTemplate) => void;
  /** Filter to a specific module type */
  filterModuleType?: string;
  className?: string;
}

// ─── Built-in Templates ───────────────────────────────────────────────────────

const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  // 保健品 - hero_section
  {
    id: "bi_health_hero_1",
    name: "权威展台风",
    category: "保健品",
    moduleType: "hero_section",
    isBuiltIn: true,
    prompt:
      "保健品产品瓶居中特写，放置在发光水晶展台上，金色奖杯与TOP1徽章环绕，高端深色渐变背景，专业棚拍光效，权威感十足，2K超清商业摄影风格",
  },
  {
    id: "bi_health_hero_2",
    name: "温暖生活流",
    category: "保健品",
    moduleType: "hero_section",
    isBuiltIn: true,
    prompt:
      "保健品产品瓶与幸福家庭生活场景融合，温暖自然光，浅米色背景，家庭成员健康互动，情感化构图，生活流摄影风格，温馨治愈",
  },
  {
    id: "bi_health_hero_3",
    name: "极简医疗风",
    category: "保健品",
    moduleType: "hero_section",
    isBuiltIn: true,
    prompt:
      "产品瓶极简白底特写，纯白背景，柔和漫射光，医疗级专业感，产品居中，周围点缀天然原料元素，干净清爽，2K超清商业摄影",
  },
  // 保健品 - ingredients
  {
    id: "bi_health_ingr_1",
    name: "成分爆炸图",
    category: "保健品",
    moduleType: "ingredients",
    isBuiltIn: true,
    prompt:
      "产品成分爆炸分解图，各成分从产品瓶向四周散开，发光粒子连接线，深色背景，科技感十足，每个成分配中文标注，医疗插画风格",
  },
  {
    id: "bi_health_ingr_2",
    name: "天然原料微距",
    category: "保健品",
    moduleType: "ingredients",
    isBuiltIn: true,
    prompt:
      "天然原料微距摄影，左侧成分实物特写（乳清蛋白粉末、大豆颗粒等），右侧产品瓶，白色简洁背景，自然光，医疗级清洁感，专业营养成分可视化",
  },
  // 保健品 - mechanism
  {
    id: "bi_health_mech_1",
    name: "人体吸收图",
    category: "保健品",
    moduleType: "mechanism",
    isBuiltIn: true,
    prompt:
      "发光人体轮廓医学插画，蓝色X光透视风格，消化吸收路径高亮显示，放大标注气泡展示靶向吸收机制，深色背景配蓝色粒子特效，科技感医疗可视化",
  },
  {
    id: "bi_health_mech_2",
    name: "分子结构可视化",
    category: "保健品",
    moduleType: "mechanism",
    isBuiltIn: true,
    prompt:
      "蛋白质分子3D结构可视化，发光蓝紫色分子链，深色宇宙感背景，科学感十足，配中文标注关键营养素，高端科技医疗风格",
  },
  // 保健品 - pain_points
  {
    id: "bi_health_pain_1",
    name: "四格痛点场景",
    category: "保健品",
    moduleType: "pain_points",
    isBuiltIn: true,
    prompt:
      "四格分屏展示都市健康困扰场景，黑白高对比度纪实摄影，疲惫上班族、肌肉酸痛、营养不足等场景，电影质感颗粒感，情感化叙事构图",
  },
  // 食品 - hero_section
  {
    id: "bi_food_hero_1",
    name: "食欲诱惑风",
    category: "食品",
    moduleType: "hero_section",
    isBuiltIn: true,
    prompt:
      "食品产品特写，暖色调美食摄影，自然光打亮，食材新鲜感，蒸汽或光泽质感，食欲感十足，高端餐厅级摄影风格，2K超清",
  },
  // 美妆 - hero_section
  {
    id: "bi_beauty_hero_1",
    name: "高奢美妆风",
    category: "美妆",
    moduleType: "hero_section",
    isBuiltIn: true,
    prompt:
      "美妆产品瓶居中，玫瑰金或香槟金背景，柔光漫射，产品表面高光反射，奢华感十足，花瓣或珍珠点缀，高端时尚杂志大片风格",
  },
];

const CATEGORIES = ["全部", "保健品", "食品", "美妆", "自定义"];
const MODULE_TYPES = [
  { value: "all", label: "全部模块" },
  { value: "hero_section", label: "首屏海报" },
  { value: "pain_points", label: "痛点场景" },
  { value: "solution", label: "解决方案" },
  { value: "ingredients", label: "成分可视化" },
  { value: "mechanism", label: "科学原理" },
  { value: "craftsmanship", label: "工艺体验" },
];

const STORAGE_KEY = "oculus_prompt_templates";
export { STORAGE_KEY, MODULE_TYPES, BUILT_IN_TEMPLATES };

// ─── Component ────────────────────────────────────────────────────────────────

export function PromptTemplateManager({
  onApply,
  filterModuleType,
  className,
}: PromptTemplateManagerProps) {
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [activeModule, setActiveModule] = useState(filterModuleType || "all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New template form state
  const [newTemplate, setNewTemplate] = useState<Partial<PromptTemplate>>({
    name: "",
    category: "保健品",
    moduleType: "hero_section",
    prompt: "",
  });

  // Load custom templates from localStorage
  useEffect(() => {
    // Wrap in timeout or check mount to avoid synchronous setState warning if strict mode is picky
    // But standard pattern is just:
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Use setTimeout to avoid synchronous setState warning in useEffect
        setTimeout(() => setCustomTemplates(JSON.parse(stored)), 0);
      }
    } catch {}
  }, []);

  const saveCustomTemplates = useCallback((templates: PromptTemplate[]) => {
    setCustomTemplates(templates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, []);

  // All templates combined
  const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates];

  // Filtered templates
  const filtered = allTemplates.filter((t) => {
    const catMatch =
      activeCategory === "全部"
        ? true
        : activeCategory === "自定义"
        ? !t.isBuiltIn
        : t.category === activeCategory;
    const modMatch = activeModule === "all" ? true : t.moduleType === activeModule;
    const searchMatch =
      !searchQuery ||
      t.name.includes(searchQuery) ||
      t.prompt.includes(searchQuery);
    return catMatch && modMatch && searchMatch;
  });

  const handleCreate = useCallback(() => {
    if (!newTemplate.name || !newTemplate.prompt) return;
    const template: PromptTemplate = {
      id: `custom_${Date.now()}`,
      name: newTemplate.name!,
      category: newTemplate.category || "保健品",
      moduleType: newTemplate.moduleType || "hero_section",
      prompt: newTemplate.prompt!,
      isBuiltIn: false,
      createdAt: Date.now(),
    };
    saveCustomTemplates([...customTemplates, template]);
    setNewTemplate({ name: "", category: "保健品", moduleType: "hero_section", prompt: "" });
    setShowCreateForm(false);
  }, [newTemplate, customTemplates, saveCustomTemplates]);

  const handleDelete = useCallback(
    (id: string) => {
      saveCustomTemplates(customTemplates.filter((t) => t.id !== id));
    },
    [customTemplates, saveCustomTemplates]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<PromptTemplate>) => {
      saveCustomTemplates(
        customTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      setEditingId(null);
    },
    [customTemplates, saveCustomTemplates]
  );

  const moduleLabel = (type: string) =>
    MODULE_TYPES.find((m) => m.value === type)?.label || type;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Prompt 模板库</h3>
          <p className="text-xs text-zinc-500 mt-0.5">即梦AI中文提示词，按类别快速选用</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-900/50 transition-all"
        >
          <Icon icon={showCreateForm ? "lucide:x" : "lucide:plus"} className="h-3.5 w-3.5" />
          {showCreateForm ? "取消" : "新建模板"}
        </motion.button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-4 space-y-3">
              <p className="text-xs font-medium text-violet-300">新建自定义模板</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="模板名称"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50"
                />
                <Select
                  value={newTemplate.category ?? "保健品"}
                  onValueChange={(v) => setNewTemplate((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white focus:ring-violet-500/50 h-auto">
                    <SelectValue placeholder="类别" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-950/95">
                    {["保健品", "食品", "美妆", "其他"].map((c) => (
                      <SelectItem key={c} value={c} className="text-xs focus:bg-violet-500/20 focus:text-violet-200">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select
                value={newTemplate.moduleType ?? "hero_section"}
                onValueChange={(v) => setNewTemplate((p) => ({ ...p, moduleType: v }))}
              >
                <SelectTrigger className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white focus:ring-violet-500/50 h-auto">
                  <SelectValue placeholder="模块类型" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950/95">
                  {MODULE_TYPES.filter((m) => m.value !== "all").map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs focus:bg-violet-500/20 focus:text-violet-200">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <textarea
                placeholder="输入中文 Prompt，面向即梦AI，描述构图/光线/色调/主体/风格..."
                value={newTemplate.prompt}
                onChange={(e) => setNewTemplate((p) => ({ ...p, prompt: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 resize-none"
              />
              <button
                onClick={handleCreate}
                disabled={!newTemplate.name || !newTemplate.prompt}
                className="w-full rounded-lg bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                保存模板
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
        <input
          type="text"
          placeholder="搜索模板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-all",
              activeCategory === cat
                ? "bg-violet-600 text-white"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Module Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {MODULE_TYPES.map((m) => (
          <button
            key={m.value}
            onClick={() => setActiveModule(m.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-all",
              activeModule === m.value
                ? "bg-blue-600/60 text-blue-200 border border-blue-500/40"
                : "bg-white/3 text-zinc-500 hover:text-zinc-300 border border-transparent"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Template List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
            <Icon icon="lucide:file-search" className="h-8 w-8 mb-2" />
            <p className="text-xs">暂无匹配模板</p>
          </div>
        )}
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isEditing={editingId === template.id}
            onApply={onApply}
            onEdit={() => setEditingId(template.id)}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={(updates) => handleUpdate(template.id, updates)}
            onDelete={() => handleDelete(template.id)}
            moduleLabel={moduleLabel}
          />
        ))}
      </div>

      <p className="text-xs text-zinc-600 text-center">
        {filtered.length} 个模板 · {customTemplates.length} 个自定义
      </p>
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: PromptTemplate;
  isEditing: boolean;
  onApply?: (t: PromptTemplate) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updates: Partial<PromptTemplate>) => void;
  onDelete: () => void;
  moduleLabel: (type: string) => string;
}

function TemplateCard({
  template,
  isEditing,
  onApply,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  moduleLabel,
}: TemplateCardProps) {
  const [editName, setEditName] = useState(template.name);
  const [editPrompt, setEditPrompt] = useState(template.prompt);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border p-3 transition-all",
        isEditing
          ? "border-violet-500/40 bg-violet-950/20"
          : "border-white/5 bg-white/3 hover:border-white/10"
      )}
    >
      {isEditing ? (
        // Edit mode
        <div className="space-y-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
          />
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onSaveEdit({ name: editName, prompt: editPrompt })}
              className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
            >
              保存
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs text-zinc-400 hover:bg-white/10 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-white">{template.name}</span>
                <span className="rounded-md bg-blue-900/40 px-1.5 py-0.5 text-[10px] text-blue-300 border border-blue-500/20">
                  {moduleLabel(template.moduleType)}
                </span>
                <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {template.category}
                </span>
                {template.isBuiltIn && (
                  <span className="rounded-md bg-amber-900/30 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">
                    内置
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "mt-1.5 text-xs text-zinc-400 leading-relaxed cursor-pointer",
                  !expanded && "line-clamp-2"
                )}
                onClick={() => setExpanded(!expanded)}
              >
                {template.prompt}
              </p>
              {template.prompt.length > 80 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 text-[10px] text-zinc-600 hover:text-zinc-400"
                >
                  {expanded ? "收起" : "展开全文"}
                </button>
              )}
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            {onApply && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onApply(template)}
                className="flex items-center gap-1 rounded-lg bg-violet-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
              >
                <Icon icon="lucide:check" className="h-3 w-3" />
                应用
              </motion.button>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(template.prompt);
              }}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Icon icon="lucide:copy" className="h-3 w-3" />
              复制
            </button>
            {!template.isBuiltIn && (
              <>
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Icon icon="lucide:pencil" className="h-3 w-3" />
                  编辑
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 rounded-lg bg-red-950/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-900/40 transition-colors"
                >
                  <Icon icon="lucide:trash-2" className="h-3 w-3" />
                  删除
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
