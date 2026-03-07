"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useUser } from "@/components/UserProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AUTOCUT_PROJECT_FORM,
  getVoiceEmotionLabel,
  getVoiceIntensityLabel,
  getVoicePaceLabel,
  getVoiceStyleLabel,
  getSegmentLabel,
  normalizeClipProviderPriority,
  type AutoCutSegmentResult,
  type AutoCutProjectRow,
  type AutoCutSegmentRow,
} from "@/lib/autocut-workflow";

type AutoCutBundle = {
  project: AutoCutProjectRow;
  segments: AutoCutSegmentRow[];
  assets: Array<Record<string, unknown>>;
  jobs: Array<{
    id: string;
    job_type: string;
    status: string;
    error_message: string | null;
    result_payload: Record<string, unknown>;
    provider_job_id: string | null;
    created_at: string;
  }>;
};

const VOICE_PROVIDER_KEY = "autocut_voice_provider";
const VOICE_MODEL_KEY = "autocut_voice_model";
const VOICE_ID_KEY = "autocut_fish_voice_id";
const CLIP_PRIORITY_KEY = "autocut_clip_provider_priority";
const SUBTITLE_STYLE_KEY = "autocut_subtitle_style";
const LOCALE_MAPPING_KEY = "autocut_default_locale_mapping";

const VOICE_OPTIONS = [
  { value: "anna", label: "Anna" },
  { value: "leo", label: "Leo" },
  { value: "nova", label: "Nova" },
  { value: "idee9936e780ce447aa66162adeacad7fe", label: "斗破苍穹旁白" },
];

const VOICE_STYLE_OPTIONS = [
  { value: "cinematic_narration", label: getVoiceStyleLabel("cinematic_narration") },
  { value: "calm_inspiring", label: getVoiceStyleLabel("calm_inspiring") },
  { value: "intense_trailer", label: getVoiceStyleLabel("intense_trailer") },
];

const SEGMENT_TYPE_OPTIONS = [
  { value: "voiceover", label: "旁白" },
  { value: "movie_quote", label: "影视台词" },
  { value: "b_roll", label: "空镜" },
];

const PIPELINE_STEPS = [
  { key: "analyze", label: "解析" },
  { key: "voice", label: "配音" },
  { key: "clips", label: "台词片段抓取" },
  { key: "subtitles", label: "字幕对齐" },
  { key: "render", label: "渲染" },
];

const STAGE_LABELS: Record<string, string> = {
  draft: "草稿",
  analyzed: "已解析",
  quote_mapped: "已映射台词",
  render_queued: "排队中",
  rendering: "正在渲染",
  rendered: "已完成",
  failed: "失败",
};

const DEFAULT_PRESET_SOURCE_TEXT = [
  "“不要等待机会，而要创造机会。”——这句名言提醒我们，成功往往属于那些主动出击、积极创造机遇的人。",
  "“每一个不曾起舞的日子，都是对生命的辜负。”——珍惜每一天，用行动去诠释生命的价值，不让任何一天虚度。",
  "“人生就像骑自行车，要保持平衡就得往前走。”——面对生活中的挑战和困难，只有不断前进，才能找到平衡和稳定。",
  "“成功的秘诀端赖坚毅的决心。”——坚定的决心是通往成功的关键，无论遇到多少困难，都要坚持下去。",
  "“你比你想象中更勇敢，比你看起来更强大，也比你以为的更聪明。”——相信自己，你拥有超越想象的力量和智慧。",
].join("\n");

function buildDefaultProjectForm() {
  return {
    ...DEFAULT_AUTOCUT_PROJECT_FORM,
    title: "未命名混剪项目",
    source_text: DEFAULT_PRESET_SOURCE_TEXT,
    settings_snapshot: {},
  };
}

function getLocalSettings() {
  if (typeof window === "undefined") {
    return {
      voice_provider: "fishaudio",
      voice_model: "speech-1",
      fish_voice_id: "anna",
      subtitle_style: "word_highlight",
      locale_mapping_enabled: true,
      clip_provider_priority: ["apify", "yarn", "playphrase", "pexels"],
    };
  }

  return {
    voice_provider: localStorage.getItem(VOICE_PROVIDER_KEY) || "fishaudio",
    voice_model: localStorage.getItem(VOICE_MODEL_KEY) || "speech-1",
    fish_voice_id: localStorage.getItem(VOICE_ID_KEY) || "anna",
    subtitle_style: localStorage.getItem(SUBTITLE_STYLE_KEY) || "word_highlight",
    locale_mapping_enabled: localStorage.getItem(LOCALE_MAPPING_KEY) !== "false",
    clip_provider_priority: JSON.parse(
      localStorage.getItem(CLIP_PRIORITY_KEY) || '["apify","yarn","playphrase","pexels"]'
    ),
  };
}

export function AutoCutWorkspace() {
  const { user } = useUser();
  const [projects, setProjects] = useState<AutoCutProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<AutoCutBundle | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState(buildDefaultProjectForm);

  const latestRenderJob = useMemo(
    () => bundle?.jobs.find((job) => job.job_type === "render") ?? null,
    [bundle]
  );
  const segmentResults = useMemo(
    () => ((latestRenderJob?.result_payload?.segment_results as AutoCutSegmentResult[] | undefined) ?? []),
    [latestRenderJob]
  );
  const segmentResultMap = useMemo(() => {
    const map = new Map<string, AutoCutSegmentResult[]>();
    for (const item of segmentResults) {
      const list = map.get(item.segment_id) ?? [];
      list.push(item);
      map.set(item.segment_id, list);
    }
    return map;
  }, [segmentResults]);
  const jobWarnings = useMemo(
    () => ((latestRenderJob?.result_payload?.warnings as string[] | undefined) ?? []),
    [latestRenderJob]
  );

  async function loadProjects(nextProjectId?: string) {
    const res = await fetch("/api/auto-cut/projects");
    const data = (await res.json()) as { items?: AutoCutProjectRow[]; error?: string };
    if (!res.ok) {
      toast.error(data.error || "加载项目失败");
      return;
    }
    const items = data.items ?? [];
    setProjects(items);
    const target = nextProjectId || selectedProjectId || items[0]?.id || null;
    if (target) {
      await loadProject(target);
    } else {
      setSelectedProjectId(null);
      setBundle(null);
      setProjectForm(buildDefaultProjectForm());
    }
  }

  async function loadProject(projectId: string) {
    const res = await fetch(`/api/auto-cut/projects/${projectId}`);
    const data = (await res.json()) as AutoCutBundle & { error?: string };
    if (!res.ok) {
      toast.error(data.error || "加载项目详情失败");
      return;
    }
    setSelectedProjectId(projectId);
    setBundle(data);
    // 音色以 voice_character 为准（含斗破苍穹旁白等长 id），与后端一致
    const voiceId = data.project.voice_character ?? data.project.fish_voice_id ?? DEFAULT_AUTOCUT_PROJECT_FORM.fish_voice_id;
    setProjectForm({
      title: data.project.title,
      source_text: data.project.source_text,
      aspect_ratio: data.project.aspect_ratio,
      duration_seconds: data.project.duration_seconds,
      fish_voice_id: voiceId,
      voice_character: voiceId,
      voice_style: data.project.voice_style || DEFAULT_AUTOCUT_PROJECT_FORM.voice_style,
      subtitle_style: data.project.subtitle_style || DEFAULT_AUTOCUT_PROJECT_FORM.subtitle_style,
      locale_mapping_enabled: data.project.locale_mapping_enabled !== false,
      clip_provider_priority: normalizeClipProviderPriority(data.project.clip_provider_priority as string[]),
      voice_provider: data.project.voice_provider || DEFAULT_AUTOCUT_PROJECT_FORM.voice_provider,
      voice_model: data.project.voice_model || DEFAULT_AUTOCUT_PROJECT_FORM.voice_model,
      settings_snapshot: data.project.settings_snapshot || {},
    });
    // Use fresh data.jobs directly — latestRenderJob is derived from the old bundle state
    const freshRenderJob = data.jobs.find((job) => job.job_type === "render") ?? null;
    if (freshRenderJob && ["queued", "running"].includes(freshRenderJob.status)) {
      setPollingJobId(freshRenderJob.id);
    }
  }

  async function createProject() {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    setBusyKey("create");
    const settings = getLocalSettings();
    const presetForm = buildDefaultProjectForm();
    const res = await fetch("/api/auto-cut/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...presetForm,
        ...settings,
        voice_character: presetForm.fish_voice_id,
        settings_snapshot: settings,
      }),
    });
    const data = (await res.json()) as { project?: AutoCutProjectRow; error?: string };
    setBusyKey(null);
    if (!res.ok || !data.project) {
      toast.error(data.error || "创建项目失败");
      return;
    }
    toast.success("项目已创建");
    await loadProjects(data.project.id);
  }

  async function saveProject() {
    if (!selectedProjectId) return;
    setBusyKey("save");
    const settings = getLocalSettings();
    const res = await fetch(`/api/auto-cut/projects/${selectedProjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...projectForm,
        ...settings,
        voice_character: projectForm.fish_voice_id,
        settings_snapshot: settings,
      }),
    });
    const data = (await res.json()) as { error?: string };
    setBusyKey(null);
    if (!res.ok) {
      toast.error(data.error || "保存项目失败");
      return;
    }
    toast.success("项目信息已保存");
    await loadProject(selectedProjectId);
  }

  async function analyzeProject() {
    if (!selectedProjectId) return;
    setBusyKey("analyze");
    const res = await fetch(`/api/auto-cut/projects/${selectedProjectId}/analyze`, { method: "POST" });
    const data = (await res.json()) as { error?: string };
    setBusyKey(null);
    if (!res.ok) {
      toast.error(data.error || "智能解析失败");
      return;
    }
    toast.success("已生成结构化时间线");
    await loadProject(selectedProjectId);
  }

  async function mapQuotes(segmentId?: string) {
    if (!selectedProjectId) return;
    setBusyKey(segmentId ? `quote-${segmentId}` : "quote-map");
    const res = await fetch(`/api/auto-cut/projects/${selectedProjectId}/quote-map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(segmentId ? { segment_id: segmentId } : {}),
    });
    const data = (await res.json()) as { error?: string };
    setBusyKey(null);
    if (!res.ok) {
      toast.error(data.error || "经典台词映射失败");
      return;
    }
    toast.success("台词映射完成");
    await loadProject(selectedProjectId);
  }

  async function addSegment(type: "voiceover" | "movie_quote" | "b_roll") {
    if (!selectedProjectId || !bundle) return;
    const res = await fetch(`/api/auto-cut/projects/${selectedProjectId}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        text: type === "movie_quote" ? "新的影视台词片段" : "新的片段文本",
        language: "zh-CN",
        source_title: null,
        source_query: null,
        b_roll_query: type === "b_roll" ? "cinematic transition shot" : "",
        duration_ms: type === "movie_quote" ? 4000 : 3000,
        enabled: true,
        metadata: { generated_by_llm: false },
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "新增片段失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function updateSegment(segment: AutoCutSegmentRow, patch: Partial<AutoCutSegmentRow>) {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/auto-cut/projects/${selectedProjectId}/segments/${segment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "更新片段失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function deleteSegment(segment: AutoCutSegmentRow) {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/auto-cut/projects/${selectedProjectId}/segments/${segment.id}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "删除片段失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function moveSegment(segment: AutoCutSegmentRow, direction: -1 | 1) {
    const ordered = [...(bundle?.segments ?? [])].sort((a, b) => a.order_index - b.order_index);
    const index = ordered.findIndex((item) => item.id === segment.id);
    const target = ordered[index + direction];
    if (!target) return;
    await Promise.all([
      updateSegment(segment, { order_index: target.order_index }),
      updateSegment(target, { order_index: segment.order_index }),
    ]);
  }

  async function renderProject() {
    if (!selectedProjectId) return;
    setBusyKey("render");
    const res = await fetch(`/api/auto-cut/projects/${selectedProjectId}/render`, { method: "POST" });
    const data = (await res.json()) as { job?: { id: string }; error?: string };
    setBusyKey(null);
    if (!res.ok || !data.job) {
      toast.error(data.error || "提交渲染失败");
      return;
    }
    toast.success("渲染任务已提交");
    setPollingJobId(data.job.id);
    await loadProject(selectedProjectId);
    // 立即查询一次进度，不等待首个 3s 轮询
    void pollJob(data.job.id, selectedProjectId);
  }

  async function pollJob(jobId: string, projectId: string) {
    try {
      const res = await fetch(`/api/auto-cut/projects/${projectId}/jobs/${jobId}`);
      const data = (await res.json()) as { job?: { status: string; result_payload?: Record<string, unknown> }; error?: string };
      if (!res.ok) {
        toast.error(data.error || "轮询任务失败");
        setPollingJobId(null);
        return;
      }
      if (["succeeded", "failed", "partial", "cancelled"].includes(data.job?.status || "")) {
        setPollingJobId(null);
        toast[data.job?.status === "succeeded" ? "success" : "error"](
          data.job?.status === "succeeded" ? "成片已输出" : "渲染任务失败"
        );
        await loadProject(projectId);
      } else {
        await loadProject(projectId);
      }
    } catch (err) {
      // 网络异常（如 ERR_NETWORK_CHANGED、断网）时不打断轮询，下次间隔会重试
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message?.includes("fetch"))) {
        toast.error("网络异常，请检查连接后刷新页面查看渲染结果");
        setPollingJobId(null);
      } else {
        toast.error("轮询任务失败");
        setPollingJobId(null);
      }
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadProjects(); }, []);

  useEffect(() => {
    if (!pollingJobId || !selectedProjectId) return;
    const timer = setInterval(() => {
      void pollJob(pollingJobId, selectedProjectId);
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingJobId, selectedProjectId]);

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Auto-Cut</h2>
          <p className="mt-1 text-xs text-zinc-400">文案转混剪成片工作台</p>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-zinc-400">项目</Label>
          <Select value={selectedProjectId || ""} onValueChange={(value) => void loadProject(value)}>
            <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue placeholder="选择项目" /></SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-950 text-white">
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={createProject} disabled={busyKey === "create"} className="bg-white text-black hover:bg-zinc-100">
              <Icon icon="lucide:plus" className="mr-1 h-4 w-4" />
              新建
            </Button>
            <Button variant="outline" onClick={saveProject} disabled={!selectedProjectId || busyKey === "save"} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
              <Icon icon="lucide:save" className="mr-1 h-4 w-4" />
              保存
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-400">标题</Label>
            <Input value={projectForm.title} onChange={(event) => setProjectForm((prev) => ({ ...prev, title: event.target.value }))} className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-400">文案 / 剧本</Label>
            <Textarea value={projectForm.source_text} onChange={(event) => setProjectForm((prev) => ({ ...prev, source_text: event.target.value }))} className="min-h-48 border-white/10 bg-white/5 text-white placeholder:text-zinc-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-400">时长</Label>
              <Select value={String(projectForm.duration_seconds)} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, duration_seconds: Number(value) }))}>
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {[15, 30, 45, 60, 90].map((value) => (
                    <SelectItem key={value} value={String(value)}>{value} 秒</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-400">画幅</Label>
              <Select value={projectForm.aspect_ratio} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, aspect_ratio: value }))}>
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {["16:9", "9:16", "1:1", "4:3", "21:9"].map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-400">Fish Audio 音色</Label>
              <Select
                value={projectForm.fish_voice_id?.trim() || "anna"}
                onValueChange={(value) => setProjectForm((prev) => ({ ...prev, fish_voice_id: value, voice_character: value }))}
              >
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue placeholder="选择音色" /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {VOICE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="cursor-pointer">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-400">配音风格</Label>
              <Select value={projectForm.voice_style} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, voice_style: value as typeof prev.voice_style }))}>
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {VOICE_STYLE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-400">字幕样式</Label>
              <Select value={projectForm.subtitle_style} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, subtitle_style: value }))}>
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  <SelectItem value="word_highlight">逐词高亮</SelectItem>
                  <SelectItem value="bounce">弹跳字幕</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div>
              <p className="text-sm text-white">中文转英文经典台词映射</p>
              <p className="text-xs text-zinc-500">默认用英文 query 检索海外影视片段</p>
            </div>
            <Switch checked={projectForm.locale_mapping_enabled} onCheckedChange={(checked) => setProjectForm((prev) => ({ ...prev, locale_mapping_enabled: checked }))} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={analyzeProject} disabled={!selectedProjectId || busyKey === "analyze"} className="bg-blue-600 text-white hover:bg-blue-500">
              <Icon icon="lucide:sparkles" className="mr-1 h-4 w-4" />
              智能解析
            </Button>
            <Button variant="outline" onClick={() => void mapQuotes()} disabled={!selectedProjectId || busyKey === "quote-map"} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
              <Icon icon="lucide:languages" className="mr-1 h-4 w-4" />
              LLM 台词映射
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">时间线</h3>
            <p className="text-xs text-zinc-400">片段 CRUD、排序、局部映射</p>
          </div>
          <div className="flex gap-2">
            {SEGMENT_TYPE_OPTIONS.map((option) => (
              <Button key={option.value} size="sm" variant="outline" onClick={() => void addSegment(option.value as "voiceover" | "movie_quote" | "b_roll")} disabled={!selectedProjectId} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
                <Icon icon="lucide:plus" className="mr-1 h-3.5 w-3.5" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 pr-4">
            {(bundle?.segments ?? []).map((segment, index) => (
              <div key={segment.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-medium",
                      segment.type === "movie_quote"
                        ? "bg-amber-500/15 text-amber-200"
                        : segment.type === "b_roll"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-blue-500/15 text-blue-200"
                    )}>
                      {getSegmentLabel(segment.type)}
                    </span>
                    <Switch checked={segment.enabled} onCheckedChange={(checked) => void updateSegment(segment, { enabled: checked })} />
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="上移片段" onClick={() => void moveSegment(segment, -1)} disabled={index === 0} className="h-7 w-7 text-zinc-400 hover:bg-white/10 hover:text-white">
                      <Icon icon="lucide:arrow-up" className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="下移片段" onClick={() => void moveSegment(segment, 1)} disabled={index === (bundle?.segments.length ?? 1) - 1} className="h-7 w-7 text-zinc-400 hover:bg-white/10 hover:text-white">
                      <Icon icon="lucide:arrow-down" className="h-4 w-4" />
                    </Button>
                    {segment.type === "movie_quote" && (
                      <Button size="icon" variant="ghost" aria-label="映射台词" onClick={() => void mapQuotes(segment.id)} disabled={busyKey === `quote-${segment.id}`} className="h-7 w-7 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200">
                        <Icon icon="lucide:languages" className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" aria-label="删除片段" onClick={() => void deleteSegment(segment)} className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                      <Icon icon="lucide:trash-2" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <Select value={segment.type} onValueChange={(value) => void updateSegment(segment, { type: value as AutoCutSegmentRow["type"] })}>
                      <SelectTrigger className="border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="border-white/10 bg-zinc-950 text-white">
                        {SEGMENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={String(segment.duration_ms)} onChange={(event) => void updateSegment(segment, { duration_ms: Number(event.target.value || 0) })} className="border-white/10 bg-white/5 text-white" />
                    <p className="text-[11px] text-zinc-500">
                      时长：{segment.duration_ms} ms ({Math.max(segment.duration_ms, 0) / 1000}s)
                    </p>
                    <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-2">
                      <p className="text-[11px] font-medium text-zinc-300">配音导演</p>
                      <Select value={segment.voice_emotion || "neutral"} onValueChange={(value) => void updateSegment(segment, { voice_emotion: value as AutoCutSegmentRow["voice_emotion"] })}>
                        <SelectTrigger className="h-8 border-white/10 bg-zinc-950/80 text-xs text-white"><SelectValue placeholder="情绪" /></SelectTrigger>
                        <SelectContent className="border-white/10 bg-zinc-950 text-white">
                          {["neutral", "determined", "tense", "warm", "urgent"].map((value) => (
                            <SelectItem key={value} value={value}>{getVoiceEmotionLabel(value as NonNullable<AutoCutSegmentRow["voice_emotion"]>)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={segment.voice_pace || "medium"} onValueChange={(value) => void updateSegment(segment, { voice_pace: value as AutoCutSegmentRow["voice_pace"] })}>
                          <SelectTrigger className="h-8 border-white/10 bg-zinc-950/80 text-xs text-white"><SelectValue placeholder="语速" /></SelectTrigger>
                          <SelectContent className="border-white/10 bg-zinc-950 text-white">
                            {["slow", "medium", "fast"].map((value) => (
                              <SelectItem key={value} value={value}>{getVoicePaceLabel(value as NonNullable<AutoCutSegmentRow["voice_pace"]>)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={segment.voice_intensity || "medium"} onValueChange={(value) => void updateSegment(segment, { voice_intensity: value as AutoCutSegmentRow["voice_intensity"] })}>
                          <SelectTrigger className="h-8 border-white/10 bg-zinc-950/80 text-xs text-white"><SelectValue placeholder="强度" /></SelectTrigger>
                          <SelectContent className="border-white/10 bg-zinc-950 text-white">
                            {["low", "medium", "high"].map((value) => (
                              <SelectItem key={value} value={value}>{getVoiceIntensityLabel(value as NonNullable<AutoCutSegmentRow["voice_intensity"]>)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Textarea value={segment.text} onChange={(event) => void updateSegment(segment, { text: event.target.value })} className="min-h-24 border-white/10 bg-white/5 text-white" />
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={segment.source_title || ""} onChange={(event) => void updateSegment(segment, { source_title: event.target.value || null })} placeholder="来源影视作品" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500" />
                      <Input value={segment.source_query || ""} onChange={(event) => void updateSegment(segment, { source_query: event.target.value || null })} placeholder="检索 query" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500" />
                    </div>
                    <Input value={segment.b_roll_query || ""} onChange={(event) => void updateSegment(segment, { b_roll_query: event.target.value || null })} placeholder="B-roll query" className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500" />
                    <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                      <p className="mb-2 font-medium text-zinc-300">结构化检索</p>
                      <div className="grid gap-2 md:grid-cols-3">
                        <Input value={segment.retrieval_intent || ""} onChange={(event) => void updateSegment(segment, { retrieval_intent: (event.target.value || null) as AutoCutSegmentRow["retrieval_intent"] })} placeholder="intent" className="h-8 border-white/10 bg-white/5 text-xs text-white placeholder:text-zinc-500" />
                        <Input value={segment.retrieval_subject || ""} onChange={(event) => void updateSegment(segment, { retrieval_subject: event.target.value || null })} placeholder="subject" className="h-8 border-white/10 bg-white/5 text-xs text-white placeholder:text-zinc-500" />
                        <Input value={segment.retrieval_mood || ""} onChange={(event) => void updateSegment(segment, { retrieval_mood: (event.target.value || null) as AutoCutSegmentRow["retrieval_mood"] })} placeholder="mood" className="h-8 border-white/10 bg-white/5 text-xs text-white placeholder:text-zinc-500" />
                      </div>
                      <Textarea
                        value={(segment.retrieval_queries || []).join("\n")}
                        onChange={(event) =>
                          void updateSegment(segment, {
                            retrieval_queries: event.target.value.split(/\n+/).map((item) => item.trim()).filter(Boolean),
                          })
                        }
                        className="mt-2 min-h-20 border-white/10 bg-white/5 text-xs text-white placeholder:text-zinc-500"
                        placeholder="每行一条 query"
                      />
                    </div>
                    {segment.metadata && Object.keys(segment.metadata).length > 0 && (
                      <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                        <p className="mb-1 font-medium text-zinc-300">元数据</p>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(segment.metadata, null, 2)}</pre>
                      </div>
                    )}
                    {(segmentResultMap.get(segment.id) ?? []).length > 0 && (
                      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-100">
                        <p className="mb-2 font-medium text-cyan-200">渲染结果</p>
                        <div className="space-y-2">
                          {(segmentResultMap.get(segment.id) ?? []).map((result, resultIndex) => (
                            <div key={`${result.segment_id}-${result.asset_kind}-${resultIndex}`} className="rounded-md border border-white/10 bg-black/30 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span>{result.asset_kind} · {result.provider}</span>
                                <span className={cn(
                                  "text-[11px]",
                                  result.status === "succeeded"
                                    ? "text-emerald-300"
                                    : result.status === "partial"
                                      ? "text-amber-300"
                                      : "text-red-300"
                                )}>
                                  {result.status}
                                </span>
                              </div>
                              {result.fallback_reason && (
                                <p className="mt-1 text-[11px] text-amber-300">降级原因：{result.fallback_reason}</p>
                              )}
                              {result.warning && (
                                <p className="mt-1 text-[11px] text-amber-200">{result.warning}</p>
                              )}
                              {result.public_url && (
                                <a href={result.public_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-[11px] text-cyan-300 underline underline-offset-2">
                                  打开素材
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(bundle?.segments.length ?? 0) === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-400">
                还没有时间线片段，先点击「智能解析」或手动新增片段。
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">渲染状态</h3>
            <p className="text-xs text-zinc-400">配音、素材、字幕与成片状态</p>
          </div>
          <Button onClick={renderProject} disabled={!selectedProjectId || busyKey === "render" || (bundle?.segments.length ?? 0) === 0} className="bg-cyan-600 text-white hover:bg-cyan-500">
            <Icon icon="lucide:clapperboard" className="mr-1 h-4 w-4" />
            开始渲染
          </Button>
        </div>

        <div className="space-y-3">
          {PIPELINE_STEPS.map((step) => {
            const stepState = Array.isArray(latestRenderJob?.result_payload?.stages)
              ? (latestRenderJob?.result_payload?.stages as Array<Record<string, unknown>>).find((item) => item.stage === step.key)?.status
              : undefined;
            return (
              <div key={step.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-sm text-zinc-200">{step.label}</span>
                <span className={cn(
                  "text-xs",
                  stepState === "succeeded"
                    ? "text-emerald-300"
                    : stepState === "running"
                      ? "text-cyan-300"
                      : stepState === "partial" || latestRenderJob?.status === "partial"
                        ? "text-amber-300"
                        : stepState === "failed" || latestRenderJob?.status === "failed"
                          ? "text-red-300"
                          : "text-zinc-500"
                )}>
                  {stepState === "succeeded"
                    ? "完成"
                    : stepState === "running"
                      ? "进行中"
                      : stepState === "partial" || latestRenderJob?.status === "partial"
                        ? "部分完成"
                        : stepState === "failed" || latestRenderJob?.status === "failed"
                          ? "失败"
                          : latestRenderJob?.status === "running" || latestRenderJob?.status === "queued"
                            ? "等待"
                            : "未开始"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">当前阶段</p>
          <p className="mt-1 text-xs text-zinc-400">
            {STAGE_LABELS[bundle?.project.current_stage ?? "draft"] ?? bundle?.project.current_stage ?? "草稿"}
          </p>
          {latestRenderJob?.error_message && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
              {latestRenderJob.error_message}
            </div>
          )}
          {jobWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              {jobWarnings.map((warning, index) => (
                <p key={`${index}-${warning}`}>{warning}</p>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex-1 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-sm font-medium text-white">成片预览</p>
          {bundle?.project.final_video_url ? (
            <div className="space-y-3">
              <video src={bundle.project.final_video_url} controls playsInline className="w-full rounded-lg border border-white/10" />
              <div className="flex gap-2">
                <a href={bundle.project.final_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">
                  <Icon icon="lucide:download" className="mr-1 h-4 w-4" />
                  下载视频
                </a>
                {bundle.project.final_subtitle_url && (
                  <a href={bundle.project.final_subtitle_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">
                    <Icon icon="lucide:captions" className="mr-1 h-4 w-4" />
                    下载字幕
                  </a>
                )}
              </div>
              {jobWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                  当前成片包含降级或部分失败，请查看上方片段结果。
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-60 items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-zinc-500">
              渲染完成后会在这里显示成片预览
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
