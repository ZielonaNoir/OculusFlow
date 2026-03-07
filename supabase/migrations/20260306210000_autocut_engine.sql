BEGIN;

CREATE TABLE public.autocut_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_text text NOT NULL,
  aspect_ratio text NOT NULL DEFAULT '16:9',
  duration_seconds integer NOT NULL DEFAULT 30,
  fish_voice_id text NOT NULL DEFAULT 'anna',
  subtitle_style text NOT NULL DEFAULT 'word_highlight',
  locale_mapping_enabled boolean NOT NULL DEFAULT true,
  clip_provider_priority jsonb NOT NULL DEFAULT '["apify","yarn","playphrase","pexels"]'::jsonb,
  voice_provider text NOT NULL DEFAULT 'fishaudio',
  voice_model text NOT NULL DEFAULT 'speech-1',
  settings_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_stage text NOT NULL DEFAULT 'draft',
  final_video_url text,
  final_subtitle_url text,
  engine_job_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.autocut_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.autocut_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('voiceover', 'movie_quote', 'b_roll')),
  order_index integer NOT NULL DEFAULT 0,
  text text NOT NULL,
  language text NOT NULL DEFAULT 'zh-CN',
  source_title text,
  source_query text,
  b_roll_query text,
  duration_ms integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.autocut_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.autocut_projects(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES public.autocut_segments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('clip', 'b_roll', 'audio', 'subtitle', 'final_video')),
  provider text,
  source_url text,
  storage_path text,
  signed_url text,
  duration_ms integer,
  trim_start_ms integer,
  trim_end_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.autocut_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.autocut_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('analyze', 'quote_map', 'render', 'fetch_clips', 'generate_voice', 'align_subtitles')),
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial', 'cancelled')),
  provider text,
  provider_job_id text,
  error_message text,
  result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_autocut_projects_user_id ON public.autocut_projects(user_id);
CREATE INDEX idx_autocut_segments_project_id ON public.autocut_segments(project_id);
CREATE INDEX idx_autocut_assets_project_id ON public.autocut_assets(project_id);
CREATE INDEX idx_autocut_jobs_project_id ON public.autocut_jobs(project_id);

ALTER TABLE public.autocut_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autocut_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autocut_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autocut_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own autocut projects"
  ON public.autocut_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own autocut projects"
  ON public.autocut_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own autocut projects"
  ON public.autocut_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own autocut projects"
  ON public.autocut_projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own autocut segments"
  ON public.autocut_segments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own autocut segments"
  ON public.autocut_segments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own autocut segments"
  ON public.autocut_segments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own autocut segments"
  ON public.autocut_segments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own autocut assets"
  ON public.autocut_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own autocut assets"
  ON public.autocut_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own autocut assets"
  ON public.autocut_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own autocut assets"
  ON public.autocut_assets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own autocut jobs"
  ON public.autocut_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own autocut jobs"
  ON public.autocut_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own autocut jobs"
  ON public.autocut_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own autocut jobs"
  ON public.autocut_jobs FOR DELETE USING (auth.uid() = user_id);

COMMIT;
