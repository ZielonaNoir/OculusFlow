-- ==========================================
-- Oculus Flow Video Workflow
-- Project-scoped script, metadata, storyboard, and generation task persistence
-- ==========================================

CREATE TABLE public.video_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '未命名视频项目',
  prompt TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT '',
  duration_seconds INT NOT NULL DEFAULT 5,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  shot_count INT NOT NULL DEFAULT 9,
  image_model TEXT,
  video_model TEXT,
  script_text TEXT NOT NULL DEFAULT '',
  current_stage TEXT NOT NULL DEFAULT 'draft',
  reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.video_project_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('character', 'asset', 'background', 'dialogue', 'action', 'emotion', 'scene')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  json_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.video_storyboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shot_count INT NOT NULL DEFAULT 9,
  prompt TEXT NOT NULL DEFAULT '',
  grid_image_url TEXT,
  selected_row INT,
  selected_col INT,
  selected_index INT,
  hd_prompt TEXT NOT NULL DEFAULT '',
  hd_image_url TEXT,
  metadata_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.video_generation_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('image', 'video', 'prompt')),
  step_key TEXT NOT NULL,
  provider_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  model_id TEXT,
  prompt TEXT NOT NULL DEFAULT '',
  params_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_url TEXT,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_video_projects_user_id ON public.video_projects(user_id);
CREATE INDEX idx_video_projects_updated_at ON public.video_projects(updated_at DESC);
CREATE INDEX idx_video_project_entities_project_id ON public.video_project_entities(project_id);
CREATE INDEX idx_video_project_entities_project_type ON public.video_project_entities(project_id, type, sort_order);
CREATE INDEX idx_video_storyboards_project_id ON public.video_storyboards(project_id);
CREATE INDEX idx_video_generation_tasks_project_id ON public.video_generation_tasks(project_id, created_at DESC);
CREATE INDEX idx_video_generation_tasks_provider_task_id ON public.video_generation_tasks(provider_task_id);

ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_project_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video projects"
  ON public.video_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video projects"
  ON public.video_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video projects"
  ON public.video_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own video projects"
  ON public.video_projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own project entities"
  ON public.video_project_entities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project entities"
  ON public.video_project_entities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project entities"
  ON public.video_project_entities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project entities"
  ON public.video_project_entities FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own storyboards"
  ON public.video_storyboards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storyboards"
  ON public.video_storyboards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storyboards"
  ON public.video_storyboards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own storyboards"
  ON public.video_storyboards FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own generation tasks"
  ON public.video_generation_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation tasks"
  ON public.video_generation_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generation tasks"
  ON public.video_generation_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generation tasks"
  ON public.video_generation_tasks FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.user_generated_assets
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.video_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS step_key TEXT,
  ADD COLUMN IF NOT EXISTS prompt TEXT,
  ADD COLUMN IF NOT EXISTS params_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_cell JSONB NOT NULL DEFAULT '{}'::jsonb;
