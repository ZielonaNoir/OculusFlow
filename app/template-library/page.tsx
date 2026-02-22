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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PromptTemplateManager, type PromptTemplate } from "@/components/oculus-flow/PromptTemplateManager";
import { MODULE_TYPES, BUILT_IN_TEMPLATES, STORAGE_KEY } from "@/components/oculus-flow/PromptTemplateManager";

const EMPTY_SELECT_VALUE = "__none__";

// ─── 方案 (Scheme) 类型与存储 ─────────────────────────────────────────────────

export interface PromptScheme {
  id: string;
  name: string;
  moduleTemplates: Record<string, string>; // moduleType -> templateId
  createdAt: number;
}

const SCHEMES_STORAGE_KEY = "oculus_prompt_schemes";

function loadSchemes(): PromptScheme[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(SCHEMES_STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveSchemes(schemes: PromptScheme[]) {
  localStorage.setItem(SCHEMES_STORAGE_KEY, JSON.stringify(schemes));
}

function loadCustomTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

// ─── 页面 ────────────────────────────────────────────────────────────────────

export default function TemplateLibraryPage() {
  const [schemes, setSchemes] = useState<PromptScheme[]>([]);
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [showNewScheme, setShowNewScheme] = useState(false);

  const refreshSchemes = useCallback(() => {
    setSchemes(loadSchemes());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    refreshSchemes();
  }, [refreshSchemes]);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-white">模板库</h1>
        <p className="text-sm text-zinc-400 mt-1">
          维护所有 Prompt 模板，并将模板组合成方案；图生图/文生图所用参考图在 Oculus Flow 左侧产品参考图处添加、替换、删除。
        </p>
      </div>

      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 rounded-lg p-1">
          <TabsTrigger value="prompts" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-md px-4 py-2">
            Prompt 模板
          </TabsTrigger>
          <TabsTrigger value="schemes" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-md px-4 py-2">
            方案
          </TabsTrigger>
        </TabsList>
        <TabsContent value="prompts" className="mt-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6">
            <p className="text-xs text-zinc-500 mb-4">
              在此对单个 Prompt 模板进行增删改查；在 Oculus Flow 方案卡片中可点击「模板」打开快速选择。
            </p>
            <PromptTemplateManager className="max-w-2xl" />
          </div>
        </TabsContent>
        <TabsContent value="schemes" className="mt-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl p-6">
            <SchemeManager
              schemes={schemes}
              onRefresh={refreshSchemes}
              editingId={editingSchemeId}
              onEdit={setEditingSchemeId}
              showNewScheme={showNewScheme}
              onShowNewScheme={setShowNewScheme}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── 方案管理（列表 + 新建/编辑）───────────────────────────────────────────────

function SchemeManager({
  schemes,
  onRefresh,
  editingId,
  onEdit,
  showNewScheme,
  onShowNewScheme,
}: {
  schemes: PromptScheme[];
  onRefresh: () => void;
  editingId: string | null;
  onEdit: (id: string | null) => void;
  showNewScheme: boolean;
  onShowNewScheme: (v: boolean) => void;
}) {
  const allTemplates = [...BUILT_IN_TEMPLATES, ...loadCustomTemplates()];

  const handleSaveNew = (name: string, moduleTemplates: Record<string, string>) => {
    const scheme: PromptScheme = {
      id: `scheme_${Date.now()}`,
      name,
      moduleTemplates: { ...moduleTemplates },
      createdAt: Date.now(),
    };
    const next = [...schemes, scheme];
    saveSchemes(next);
    onRefresh();
    onShowNewScheme(false);
  };

  const handleUpdate = (id: string, updates: { name?: string; moduleTemplates?: Record<string, string> }) => {
    const next = schemes.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    saveSchemes(next);
    onRefresh();
    onEdit(null);
  };

  const handleDelete = (id: string) => {
    saveSchemes(schemes.filter((s) => s.id !== id));
    onRefresh();
    onEdit(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          方案 = 为每个模块选定一个 Prompt 模板，组合成一套完整方案，可增删改查。
        </p>
        <button
          type="button"
          onClick={() => onShowNewScheme(!showNewScheme)}
          className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-950/40 px-3 py-2 text-xs font-medium text-violet-300 hover:bg-violet-900/50 transition-all"
        >
          <Icon icon={showNewScheme ? "lucide:x" : "lucide:plus"} className="h-4 w-4" />
          {showNewScheme ? "取消" : "新建方案"}
        </button>
      </div>

      <AnimatePresence>
        {showNewScheme && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <SchemeEditor
              name=""
              moduleTemplates={{}}
              allTemplates={allTemplates}
              onSave={handleSaveNew}
              onCancel={() => onShowNewScheme(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {schemes.length === 0 && !showNewScheme && (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/5 py-12 text-center text-zinc-500 text-sm">
            暂无方案，点击「新建方案」创建
          </div>
        )}
        {schemes.map((scheme) => (
          <div
            key={scheme.id}
            className={cn(
              "rounded-xl border p-4 transition-all",
              editingId === scheme.id
                ? "border-violet-500/40 bg-violet-950/20"
                : "border-white/10 bg-white/5 hover:border-white/20"
            )}
          >
            {editingId === scheme.id ? (
              <SchemeEditor
                name={scheme.name}
                moduleTemplates={scheme.moduleTemplates}
                allTemplates={allTemplates}
                onSave={(name, moduleTemplates) => handleUpdate(scheme.id, { name, moduleTemplates })}
                onCancel={() => onEdit(null)}
                onDelete={() => handleDelete(scheme.id)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-white">{scheme.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {Object.keys(scheme.moduleTemplates).length} 个模块已选
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(scheme.id)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(scheme.id)}
                    className="rounded-lg bg-red-950/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/40 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 方案编辑表单（新建或编辑）────────────────────────────────────────────────

function SchemeEditor({
  name: initialName,
  moduleTemplates: initialModuleTemplates,
  allTemplates,
  onSave,
  onCancel,
  onDelete,
}: {
  name: string;
  moduleTemplates: Record<string, string>;
  allTemplates: PromptTemplate[];
  onSave: (name: string, moduleTemplates: Record<string, string>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [moduleTemplates, setModuleTemplates] = useState<Record<string, string>>({ ...initialModuleTemplates });

  const moduleTypes = MODULE_TYPES.filter((m) => m.value !== "all");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="方案名称"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50"
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">为每个模块选择使用的 Prompt 模板（可选）</p>
        {moduleTypes.map((m) => {
          const options = allTemplates.filter((t) => t.moduleType === m.value);
          const current = moduleTemplates[m.value] ?? "";
          const selectValue = current || EMPTY_SELECT_VALUE;
          return (
            <div key={m.value} className="flex items-center gap-3">
              <span className="w-24 text-xs text-zinc-400 shrink-0">{m.label}</span>
              <Select
                value={selectValue}
                onValueChange={(v) =>
                  setModuleTemplates((prev) => ({
                    ...prev,
                    [m.value]: v === EMPTY_SELECT_VALUE ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white focus:ring-violet-500/50 h-auto">
                  <SelectValue placeholder="未选择" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950/95">
                  <SelectItem value={EMPTY_SELECT_VALUE} className="text-xs focus:bg-violet-500/20 focus:text-violet-200">
                    未选择
                  </SelectItem>
                  {options.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs focus:bg-violet-500/20 focus:text-violet-200">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(name.trim(), moduleTemplates)}
          disabled={!name.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-white/5 px-4 py-2 text-xs text-zinc-400 hover:bg-white/10 transition-colors"
        >
          取消
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-950/30 px-4 py-2 text-xs text-red-400 hover:bg-red-900/40 transition-colors ml-auto"
          >
            删除方案
          </button>
        )}
      </div>
    </div>
  );
}
