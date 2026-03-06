"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useUser } from "@/components/UserProvider";
import { ArkImageGenOptionsPanel } from "@/components/oculus-flow/ArkImageGenOptionsPanel";
import {
  DEFAULT_ARK_IMAGE_GEN_OPTIONS,
  type ArkImageGenOptions,
} from "@/components/oculus-flow/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_PROJECT_FORM,
  ENTITY_TYPE_LABELS,
  inferStoryboardGrid,
  type VideoProjectEntityType,
  type VideoWorkflowStep,
} from "@/lib/oculus-video-workflow";

type ProjectListItem = {
  id: string;
  title: string;
  genre: string;
  tone: string;
  duration_seconds: number;
  aspect_ratio: string;
  shot_count: number;
  image_model: string | null;
  video_model: string | null;
  current_stage: string;
  updated_at: string;
  created_at: string;
};

type WorkflowEntity = {
  id: string;
  type: VideoProjectEntityType;
  name: string;
  description: string;
  enabled: boolean;
  sort_order: number;
  json_payload: Record<string, unknown>;
};

type StoryboardRecord = {
  id: string;
  shot_count: number;
  prompt: string;
  grid_image_url: string | null;
  selected_row: number | null;
  selected_col: number | null;
  selected_index: number | null;
  hd_prompt: string;
  hd_image_url: string | null;
  metadata_snapshot: Record<string, unknown>;
};

type WorkflowTask = {
  id: string;
  task_type: "image" | "video" | "prompt";
  step_key: string;
  provider_task_id: string | null;
  status: string;
  model_id: string | null;
  prompt: string;
  result_url: string | null;
  result_payload: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
};

type ProjectBundle = {
  project: {
    id: string;
    title: string;
    prompt: string;
    genre: string;
    tone: string;
    duration_seconds: number;
    aspect_ratio: string;
    shot_count: number;
    image_model: string | null;
    video_model: string | null;
    script_text: string;
    current_stage: string;
    reference_images: string[];
    extra_context: Record<string, unknown>;
  };
  entities: WorkflowEntity[];
  storyboards: StoryboardRecord[];
  tasks: WorkflowTask[];
};

const IMAGE_MODEL_KEY = "oculus_image_model";
const VIDEO_MODEL_KEY = "oculus_video_model";
const DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-lite";
const DEFAULT_VIDEO_MODEL = "doubao-seedance-1-5-pro";

const WORKFLOW_STEPS: Array<{
  step: VideoWorkflowStep;
  title: string;
  description: string;
  entityTypes?: VideoProjectEntityType[];
}> = [
  {
    step: "character_turnaround",
    title: "人物四视角",
    description: "按角色实体生成正/侧/后/透视四宫格。",
    entityTypes: ["character"],
  },
  {
    step: "asset_turnaround",
    title: "资产四视角",
    description: "按资产实体生成产品/道具四视图。",
    entityTypes: ["asset"],
  },
  {
    step: "background_plate",
    title: "背景图",
    description: "根据场景和背景实体生成环境板。",
    entityTypes: ["background", "scene"],
  },
  {
    step: "dialogue_motion_board",
    title: "动作/情绪/对话辅助图",
    description: "为分镜前置生成表演状态参考。",
    entityTypes: ["dialogue", "action", "emotion"],
  },
  {
    step: "storyboard_grid",
    title: "分镜总图",
    description: "按所选宫格数输出故事板总图。",
  },
  {
    step: "storyboard_hd",
    title: "4K 高清分镜",
    description: "基于选中宫格放大为高清单帧。",
  },
  {
    step: "final_video",
    title: "最终视频",
    description: "用当前剧本、元数据与分镜结果生成视频。",
  },
];

export function OculusVideoWorkspace() {
  const { user } = useUser();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [projectForm, setProjectForm] = useState({
    ...DEFAULT_PROJECT_FORM,
    title: "未命名视频项目",
    prompt: "为当前商品或创意需求创作一支 5 秒的商业感短视频。",
  });
  const [shotCount, setShotCount] = useState("9");
  const [arkOptions, setArkOptions] = useState<ArkImageGenOptions>(
    DEFAULT_ARK_IMAGE_GEN_OPTIONS
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pollingTaskId, setPollingTaskId] = useState<string | null>(null);
  const [videoDraftMode, setVideoDraftMode] = useState(false);
  const [videoAudio, setVideoAudio] = useState(true);
  const [videoResolution, setVideoResolution] = useState("720p");
  const [videoServiceTier, setVideoServiceTier] = useState("default");
  const [referenceUploading, setReferenceUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storyboard = bundle?.storyboards?.[0] ?? null;
  const latestTasksByStep = useMemo(() => {
    const map = new Map<string, WorkflowTask>();
    for (const task of bundle?.tasks ?? []) {
      if (!map.has(task.step_key)) map.set(task.step_key, task);
    }
    return map;
  }, [bundle]);

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!pollingTaskId) return;
    const timer = setInterval(() => {
      void pollVideoTask(pollingTaskId);
    }, 3500);
    return () => clearInterval(timer);
  }, [pollingTaskId]);

  async function loadProjects(nextProjectId?: string) {
    const res = await fetch("/api/oculus/video-projects");
    const data = (await res.json()) as { items?: ProjectListItem[]; error?: string };
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
    }
  }

  async function loadProject(projectId: string) {
    const res = await fetch(`/api/oculus/video-projects/${projectId}`);
    const data = (await res.json()) as ProjectBundle & { error?: string };
    if (!res.ok) {
      toast.error(data.error || "加载项目详情失败");
      return;
    }
    setSelectedProjectId(projectId);
    setBundle(data);
    setProjectForm({
      title: data.project.title,
      prompt: data.project.prompt,
      genre: data.project.genre,
      tone: data.project.tone,
      duration_seconds: data.project.duration_seconds,
      aspect_ratio: data.project.aspect_ratio,
      shot_count: data.project.shot_count,
    });
    setShotCount(String(data.project.shot_count));
  }

  async function createProject() {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    setBusyKey("create-project");
    const imageModel = typeof window !== "undefined"
      ? localStorage.getItem(IMAGE_MODEL_KEY) || DEFAULT_IMAGE_MODEL
      : DEFAULT_IMAGE_MODEL;
    const videoModel = typeof window !== "undefined"
      ? localStorage.getItem(VIDEO_MODEL_KEY) || DEFAULT_VIDEO_MODEL
      : DEFAULT_VIDEO_MODEL;
    const res = await fetch("/api/oculus/video-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...projectForm,
        shot_count: Number(shotCount),
        image_model: imageModel,
        video_model: videoModel,
      }),
    });
    const data = (await res.json()) as { project?: { id: string }; error?: string };
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
    setBusyKey("save-project");
    const imageModel = typeof window !== "undefined"
      ? localStorage.getItem(IMAGE_MODEL_KEY) || DEFAULT_IMAGE_MODEL
      : DEFAULT_IMAGE_MODEL;
    const videoModel = typeof window !== "undefined"
      ? localStorage.getItem(VIDEO_MODEL_KEY) || DEFAULT_VIDEO_MODEL
      : DEFAULT_VIDEO_MODEL;
    const res = await fetch(`/api/oculus/video-projects/${selectedProjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...projectForm,
        shot_count: Number(shotCount),
        image_model: imageModel,
        video_model: videoModel,
      }),
    });
    const data = (await res.json()) as { error?: string };
    setBusyKey(null);
    if (!res.ok) {
      toast.error(data.error || "保存项目失败");
      return;
    }
    toast.success("项目已保存");
    await loadProjects(selectedProjectId);
  }

  async function handleReferenceFiles(files: FileList | null) {
    if (!files || files.length === 0 || !selectedProjectId) return;
    setReferenceUploading(true);
    const base64Files = await Promise.all(
      Array.from(files).slice(0, 6).map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(String(event.target?.result || ""));
            reader.readAsDataURL(file);
          })
      )
    );
    const nextImages = [...(bundle?.project.reference_images ?? []), ...base64Files].slice(0, 6);
    const res = await fetch(`/api/oculus/video-projects/${selectedProjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference_images: nextImages }),
    });
    const data = (await res.json()) as { error?: string };
    setReferenceUploading(false);
    if (!res.ok) {
      toast.error(data.error || "保存参考图失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function generateScript() {
    if (!selectedProjectId) return;
    setBusyKey("script");
    const res = await fetch(`/api/oculus/video-projects/${selectedProjectId}/script`, {
      method: "POST",
    });
    const data = (await res.json()) as { error?: string };
    setBusyKey(null);
    if (!res.ok) {
      toast.error(data.error || "生成剧本失败");
      return;
    }
    toast.success("剧本已生成");
    await loadProject(selectedProjectId);
  }

  async function extractEntities() {
    if (!selectedProjectId) return;
    setBusyKey("extract");
    const res = await fetch(`/api/oculus/video-projects/${selectedProjectId}/entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "extract" }),
    });
    const data = (await res.json()) as { error?: string };
    setBusyKey(null);
    if (!res.ok) {
      toast.error(data.error || "提取元数据失败");
      return;
    }
    toast.success("已提取并落库元数据");
    await loadProject(selectedProjectId);
  }

  async function createEntity(type: VideoProjectEntityType) {
    if (!selectedProjectId) return;
    const sortOrder =
      (bundle?.entities
        .filter((item) => item.type === type)
        .reduce((max, item) => Math.max(max, item.sort_order), -1) ?? -1) + 1;
    const res = await fetch(`/api/oculus/video-projects/${selectedProjectId}/entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        name: `${ENTITY_TYPE_LABELS[type]} ${sortOrder + 1}`,
        description: "",
        enabled: true,
        sort_order: sortOrder,
        json_payload: {},
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "新增实体失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function updateEntity(entity: WorkflowEntity, patch: Partial<WorkflowEntity>) {
    if (!selectedProjectId) return;
    const res = await fetch(
      `/api/oculus/video-projects/${selectedProjectId}/entities/${entity.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "更新实体失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function deleteEntity(entity: WorkflowEntity) {
    if (!selectedProjectId) return;
    const res = await fetch(
      `/api/oculus/video-projects/${selectedProjectId}/entities/${entity.id}`,
      { method: "DELETE" }
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "删除实体失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function moveEntity(entity: WorkflowEntity, direction: -1 | 1) {
    const siblings = (bundle?.entities ?? [])
      .filter((item) => item.type === entity.type)
      .sort((a, b) => a.sort_order - b.sort_order);
    const index = siblings.findIndex((item) => item.id === entity.id);
    const other = siblings[index + direction];
    if (!other) return;
    await Promise.all([
      updateEntity(entity, { sort_order: other.sort_order }),
      updateEntity(other, { sort_order: entity.sort_order }),
    ]);
  }

  function getStepEntities(step: VideoWorkflowStep) {
    const config = WORKFLOW_STEPS.find((item) => item.step === step);
    if (!config?.entityTypes) return bundle?.entities.filter((item) => item.enabled) ?? [];
    return (bundle?.entities ?? []).filter(
      (item) => item.enabled && config.entityTypes?.includes(item.type)
    );
  }

  async function requestWorkflowPrompt(step: VideoWorkflowStep, entityIds: string[] = []) {
    if (!selectedProjectId) throw new Error("请选择项目");
    const res = await fetch(`/api/oculus/video-projects/${selectedProjectId}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step,
        entity_ids: entityIds,
        shot_count: Number(shotCount),
        selected_row: storyboard?.selected_row ?? undefined,
        selected_col: storyboard?.selected_col ?? undefined,
        selected_index: storyboard?.selected_index ?? undefined,
        image_options: arkOptions,
      }),
    });
    const data = (await res.json()) as { prompt?: string; error?: string };
    if (!res.ok || !data.prompt) {
      throw new Error(data.error || "生成提示词失败");
    }
    return data.prompt;
  }

  async function generateImageStep(step: VideoWorkflowStep) {
    if (!selectedProjectId || !bundle) return;
    setBusyKey(step);
    try {
      const entities = getStepEntities(step);
      const prompt = await requestWorkflowPrompt(
        step,
        entities.map((item) => item.id)
      );
      const imageModel = typeof window !== "undefined"
        ? localStorage.getItem(IMAGE_MODEL_KEY) || DEFAULT_IMAGE_MODEL
        : DEFAULT_IMAGE_MODEL;

      const res = await fetch("/api/oculus/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          moduleType: step,
          modelId: imageModel,
          refImages: bundle.project.reference_images ?? [],
          imageOptions: {
            ...arkOptions,
            size: step === "storyboard_hd" ? "4K" : arkOptions.size,
          },
          projectId: selectedProjectId,
          generationKind: step,
          metadataSnapshot: {
            entities,
            script_text: bundle.project.script_text,
            project_prompt: bundle.project.prompt,
          },
          selectedCell: storyboard
            ? {
                row: storyboard.selected_row,
                col: storyboard.selected_col,
                index: storyboard.selected_index,
              }
            : {},
        }),
      });
      const data = (await res.json()) as { image_url?: string; error?: string };
      if (!res.ok || !data.image_url) {
        throw new Error(data.error || "生成图片失败");
      }

      if (step === "storyboard_grid" || step === "storyboard_hd") {
        const storyRes = await fetch(
          `/api/oculus/video-projects/${selectedProjectId}/storyboards`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shot_count: Number(shotCount),
              prompt: step === "storyboard_grid" ? prompt : storyboard?.prompt || prompt,
              grid_image_url:
                step === "storyboard_grid"
                  ? data.image_url
                  : storyboard?.grid_image_url || "",
              selected_row: storyboard?.selected_row ?? null,
              selected_col: storyboard?.selected_col ?? null,
              selected_index: storyboard?.selected_index ?? null,
              hd_prompt: step === "storyboard_hd" ? prompt : storyboard?.hd_prompt || "",
              hd_image_url:
                step === "storyboard_hd"
                  ? data.image_url
                  : storyboard?.hd_image_url || "",
              metadata_snapshot: {
                entities,
                image_options: arkOptions,
              },
            }),
          }
        );
        const storyData = (await storyRes.json()) as { error?: string };
        if (!storyRes.ok) {
          throw new Error(storyData.error || "保存分镜失败");
        }
      }

      toast.success(`${WORKFLOW_STEPS.find((item) => item.step === step)?.title || step} 已生成`);
      await loadProject(selectedProjectId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function selectStoryboardCell(index: number) {
    if (!selectedProjectId || !storyboard) return;
    const grid = inferStoryboardGrid(Number(shotCount));
    const row = Math.floor((index - 1) / grid.cols) + 1;
    const col = ((index - 1) % grid.cols) + 1;
    const res = await fetch(`/api/oculus/video-projects/${selectedProjectId}/storyboards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shot_count: storyboard.shot_count,
        prompt: storyboard.prompt,
        grid_image_url: storyboard.grid_image_url || "",
        selected_row: row,
        selected_col: col,
        selected_index: index,
        hd_prompt: storyboard.hd_prompt,
        hd_image_url: storyboard.hd_image_url || "",
        metadata_snapshot: storyboard.metadata_snapshot,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "保存宫格选择失败");
      return;
    }
    await loadProject(selectedProjectId);
  }

  async function generateFinalVideo() {
    if (!selectedProjectId || !bundle) return;
    setBusyKey("final_video");
    try {
      const prompt = await requestWorkflowPrompt("final_video");
      const videoModel = typeof window !== "undefined"
        ? localStorage.getItem(VIDEO_MODEL_KEY) || DEFAULT_VIDEO_MODEL
        : DEFAULT_VIDEO_MODEL;
      const res = await fetch("/api/oculus/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          modelId: videoModel,
          moduleType: "final_video",
          projectId: selectedProjectId,
          paramsSnapshot: {
            script_text: bundle.project.script_text,
            entities: bundle.entities,
            storyboard,
          },
          ratio: bundle.project.aspect_ratio,
          duration: bundle.project.duration_seconds,
          resolution: videoResolution,
          seed: arkOptions.seed,
          camera_fixed: false,
          watermark: arkOptions.watermark,
          generate_audio: videoAudio,
          draft: videoDraftMode,
          service_tier: videoServiceTier,
          return_last_frame: !videoDraftMode,
        }),
      });
      const data = (await res.json()) as { taskId?: string; error?: string };
      if (!res.ok || !data.taskId) {
        throw new Error(data.error || "创建视频任务失败");
      }
      setPollingTaskId(data.taskId);
      toast.success("视频任务已创建，正在轮询结果");
      await loadProject(selectedProjectId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成视频失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function pollVideoTask(taskId: string) {
    const res = await fetch(`/api/oculus/video?taskId=${taskId}`);
    const data = (await res.json()) as {
      status?: string;
      result?: { video_url?: string };
      error?: string | null;
    };
    if (!res.ok) {
      toast.error(data.error || "查询视频任务失败");
      setPollingTaskId(null);
      return;
    }
    if (data.status === "succeeded" && data.result?.video_url) {
      toast.success("视频生成完成");
      setPollingTaskId(null);
      if (selectedProjectId) await loadProject(selectedProjectId);
      return;
    }
    if (data.status === "failed" || data.status === "expired") {
      toast.error(data.error || "视频生成失败");
      setPollingTaskId(null);
    }
    if (selectedProjectId) await loadProject(selectedProjectId);
  }

  async function saveAsset(url: string, type: "image" | "video", stepKey: string) {
    if (!selectedProjectId || !bundle) return;
    const res = await fetch("/api/assets/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        type,
        source: "oculus",
        project_id: selectedProjectId,
        step_key: stepKey,
        prompt: latestTasksByStep.get(stepKey)?.prompt || "",
        params_snapshot:
          type === "image"
            ? arkOptions
            : { resolution: videoResolution, draft: videoDraftMode, audio: videoAudio },
        metadata_snapshot: {
          script_text: bundle.project.script_text,
          storyboard,
        },
        selected_cell: storyboard
          ? {
              row: storyboard.selected_row,
              col: storyboard.selected_col,
              index: storyboard.selected_index,
            }
          : {},
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "保存到我的作品失败");
      return;
    }
    toast.success("已保存到我的作品");
  }

  const selectedVideoTask = latestTasksByStep.get("final_video");

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-[320px_minmax(360px,1fr)_minmax(420px,1.2fr)] gap-6">
      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">AI Video Workspace</h2>
            <p className="text-xs text-zinc-400">剧本驱动的分镜到视频工作流</p>
          </div>
          <Button size="sm" onClick={createProject} disabled={busyKey === "create-project"} className="bg-blue-600 text-white hover:bg-blue-500">
            <Icon icon="lucide:plus" className="mr-1 h-4 w-4" />
            新建
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-500">项目列表</Label>
            <Select value={selectedProjectId ?? ""} onValueChange={(value) => void loadProject(value)}>
              <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white">
                <SelectValue placeholder="选择一个项目" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-950 text-white">
                {projects.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-500">项目标题</Label>
            <Input value={projectForm.title} onChange={(event) => setProjectForm((prev) => ({ ...prev, title: event.target.value }))} className="border-white/10 bg-zinc-900/80 text-white" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-500">用户输入</Label>
            <Textarea value={projectForm.prompt} onChange={(event) => setProjectForm((prev) => ({ ...prev, prompt: event.target.value }))} className="min-h-28 border-white/10 bg-zinc-900/80 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-500">题材</Label>
              <Input value={projectForm.genre} onChange={(event) => setProjectForm((prev) => ({ ...prev, genre: event.target.value }))} className="border-white/10 bg-zinc-900/80 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-500">基调</Label>
              <Input value={projectForm.tone} onChange={(event) => setProjectForm((prev) => ({ ...prev, tone: event.target.value }))} className="border-white/10 bg-zinc-900/80 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-500">时长</Label>
              <Select value={String(projectForm.duration_seconds)} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, duration_seconds: Number(value) }))}>
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {[4, 5, 6, 8, 10, 12].map((value) => <SelectItem key={value} value={String(value)}>{value} 秒</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-500">画幅</Label>
              <Select value={projectForm.aspect_ratio} onValueChange={(value) => setProjectForm((prev) => ({ ...prev, aspect_ratio: value }))}>
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {["16:9", "9:16", "1:1", "4:3", "21:9"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-500">宫格数</Label>
              <Select value={shotCount} onValueChange={setShotCount}>
                <SelectTrigger className="border-white/10 bg-zinc-900/80 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {[4, 6, 8, 9, 12].map((value) => <SelectItem key={value} value={String(value)}>{value} 宫格</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-white">参考图</p>
                <p className="text-[11px] text-zinc-500">最多 6 张，保存在项目中</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!selectedProjectId || referenceUploading} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
                <Icon icon="lucide:image-plus" className="mr-1 h-4 w-4" />
                上传
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleReferenceFiles(event.target.files)} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(bundle?.project.reference_images ?? []).map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="h-20 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
            <p>图片模型：{typeof window !== "undefined" ? localStorage.getItem(IMAGE_MODEL_KEY) || DEFAULT_IMAGE_MODEL : DEFAULT_IMAGE_MODEL}</p>
            <p>视频模型：{typeof window !== "undefined" ? localStorage.getItem(VIDEO_MODEL_KEY) || DEFAULT_VIDEO_MODEL : DEFAULT_VIDEO_MODEL}</p>
          </div>

          <Button onClick={saveProject} disabled={!selectedProjectId || busyKey === "save-project"} className="w-full bg-white text-black hover:bg-zinc-100">
            <Icon icon="lucide:save" className="mr-2 h-4 w-4" />
            保存项目信息
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">剧本与元数据</h3>
            <p className="text-xs text-zinc-400">生成、提取并手动维护结构化信息</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={generateScript} disabled={!selectedProjectId || busyKey === "script"} className="bg-blue-600 text-white hover:bg-blue-500">
              <Icon icon="lucide:file-pen-line" className="mr-1 h-4 w-4" />
              出剧本
            </Button>
            <Button size="sm" variant="outline" onClick={extractEntities} disabled={!selectedProjectId || !bundle?.project.script_text || busyKey === "extract"} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
              <Icon icon="lucide:scan-search" className="mr-1 h-4 w-4" />
              提取元数据
            </Button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <Label className="mb-2 block text-xs uppercase tracking-wider text-zinc-500">剧本</Label>
          <ScrollArea className="h-40 rounded-lg border border-white/5 bg-zinc-950/60 p-3">
            <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{bundle?.project.script_text || "还没有剧本，先点击“出剧本”。"}</pre>
          </ScrollArea>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 pr-4">
            {(Object.keys(ENTITY_TYPE_LABELS) as VideoProjectEntityType[]).map((type) => {
              const items = (bundle?.entities ?? []).filter((item) => item.type === type).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={type} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{ENTITY_TYPE_LABELS[type]}</p>
                      <p className="text-[11px] text-zinc-500">{items.length} 条</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void createEntity(type)} disabled={!selectedProjectId} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
                      <Icon icon="lucide:plus" className="mr-1 h-4 w-4" />
                      新增
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {items.length === 0 && <div className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-zinc-500">暂无 {ENTITY_TYPE_LABELS[type]}，可手动新增或通过剧本提取。</div>}
                    {items.map((entity, index) => (
                      <div key={entity.id} className="rounded-lg border border-white/10 bg-zinc-950/60 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Switch checked={entity.enabled} onCheckedChange={(checked) => void updateEntity(entity, { enabled: checked })} />
                            <span className="text-xs text-zinc-400">{entity.enabled ? "启用" : "禁用"}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => void moveEntity(entity, -1)} disabled={index === 0} className="h-7 w-7 text-zinc-400 hover:bg-white/10 hover:text-white"><Icon icon="lucide:arrow-up" className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => void moveEntity(entity, 1)} disabled={index === items.length - 1} className="h-7 w-7 text-zinc-400 hover:bg-white/10 hover:text-white"><Icon icon="lucide:arrow-down" className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => void deleteEntity(entity)} className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"><Icon icon="lucide:trash-2" className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <Input value={entity.name} onChange={(event) => void updateEntity(entity, { name: event.target.value })} className="mb-2 border-white/10 bg-white/5 text-white" />
                        <Textarea value={entity.description} onChange={(event) => void updateEntity(entity, { description: event.target.value })} className="min-h-20 border-white/10 bg-white/5 text-white" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">生成流水线</h3>
            <p className="text-xs text-zinc-400">统一使用精修 agent 图片参数与账号模型配置</p>
          </div>
          <div className="w-60">
            <ArkImageGenOptionsPanel value={arkOptions} onChange={setArkOptions} />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 pr-4">
            {WORKFLOW_STEPS.map((item) => {
              const task = latestTasksByStep.get(item.step);
              const isBusy = busyKey === item.step;
              const imageUrl = task?.task_type === "image" ? task.result_url : null;
              return (
                <div key={item.step} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-zinc-500">{item.description}</p>
                    </div>
                    {item.step !== "final_video" ? (
                      <Button
                        size="sm"
                        onClick={() => void generateImageStep(item.step)}
                        disabled={!selectedProjectId || isBusy || (item.step === "storyboard_hd" && !storyboard?.selected_index)}
                        className="bg-white text-black hover:bg-zinc-100"
                      >
                        {isBusy ? <Icon icon="lucide:loader-2" className="mr-1 h-4 w-4 animate-spin" /> : <Icon icon="lucide:sparkles" className="mr-1 h-4 w-4" />}
                        生成
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void generateFinalVideo()}
                        disabled={!selectedProjectId || isBusy || !storyboard?.hd_image_url}
                        className="bg-cyan-600 text-white hover:bg-cyan-500"
                      >
                        {isBusy ? <Icon icon="lucide:loader-2" className="mr-1 h-4 w-4 animate-spin" /> : <Icon icon="lucide:clapperboard" className="mr-1 h-4 w-4" />}
                        生成视频
                      </Button>
                    )}
                  </div>

                  {item.step === "final_video" && (
                    <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-zinc-950/50 p-3 text-xs text-zinc-300">
                      <label className="flex items-center justify-between gap-2">
                        <span>样片模式</span>
                        <Switch checked={videoDraftMode} onCheckedChange={setVideoDraftMode} />
                      </label>
                      <label className="flex items-center justify-between gap-2">
                        <span>自动音频</span>
                        <Switch checked={videoAudio} onCheckedChange={setVideoAudio} />
                      </label>
                      <Select value={videoResolution} onValueChange={setVideoResolution}>
                        <SelectTrigger className="border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-white/10 bg-zinc-950 text-white">
                          {["480p", "720p", "1080p"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={videoServiceTier} onValueChange={setVideoServiceTier}>
                        <SelectTrigger className="border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-white/10 bg-zinc-950 text-white">
                          <SelectItem value="default">default</SelectItem>
                          <SelectItem value="flex">flex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {item.step === "storyboard_grid" && storyboard?.grid_image_url && (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={storyboard.grid_image_url} alt="" className="w-full rounded-lg border border-white/10 object-cover" />
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: Number(shotCount) }, (_, index) => {
                          const cellIndex = index + 1;
                          const selected = storyboard.selected_index === cellIndex;
                          return (
                            <Button key={cellIndex} size="sm" variant="outline" onClick={() => void selectStoryboardCell(cellIndex)} className={selected ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"}>
                              选第 {cellIndex} 格
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {item.step === "storyboard_hd" && storyboard?.hd_image_url && (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={storyboard.hd_image_url} alt="" className="w-full rounded-lg border border-white/10 object-cover" />
                      <Button size="sm" variant="outline" onClick={() => void saveAsset(storyboard.hd_image_url!, "image", "storyboard_hd")} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
                        <Icon icon="lucide:bookmark-plus" className="mr-1 h-4 w-4" />
                        保存到作品
                      </Button>
                    </div>
                  )}

                  {imageUrl && item.step !== "storyboard_grid" && item.step !== "storyboard_hd" && (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="w-full rounded-lg border border-white/10 object-cover" />
                      <Button size="sm" variant="outline" onClick={() => void saveAsset(imageUrl, "image", item.step)} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
                        <Icon icon="lucide:bookmark-plus" className="mr-1 h-4 w-4" />
                        保存到作品
                      </Button>
                    </div>
                  )}

                  {item.step === "final_video" && selectedVideoTask?.result_url && (
                    <div className="space-y-3">
                      <video src={selectedVideoTask.result_url} controls playsInline className="w-full rounded-lg border border-white/10" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => void saveAsset(selectedVideoTask.result_url!, "video", "final_video")} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
                          <Icon icon="lucide:bookmark-plus" className="mr-1 h-4 w-4" />
                          保存到作品
                        </Button>
                        <a href={selectedVideoTask.result_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">
                          <Icon icon="lucide:download" className="mr-1 h-4 w-4" />
                          下载
                        </a>
                      </div>
                    </div>
                  )}

                  {item.step === "final_video" && selectedVideoTask && !selectedVideoTask.result_url && (
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-200">
                      当前状态：{selectedVideoTask.status}
                    </div>
                  )}

                  {task?.error_message && (
                    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                      {task.error_message}
                    </div>
                  )}

                  {task?.prompt && (
                    <details className="mt-3 rounded-lg border border-white/10 bg-zinc-950/50 p-3">
                      <summary className="cursor-pointer text-xs text-zinc-400">查看最终 Prompt</summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-300">{task.prompt}</pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
