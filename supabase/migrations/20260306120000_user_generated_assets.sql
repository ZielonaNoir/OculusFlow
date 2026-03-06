-- ==========================================
-- User Generated Assets (Save to Account)
-- Table + Storage bucket and RLS
-- ==========================================

-- 1. Metadata table for "我的作品"
CREATE TABLE public.user_generated_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  storage_path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'retouch' CHECK (source IN ('retouch', 'oculus', 'style', 'setgen')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_generated_assets_user_id ON public.user_generated_assets(user_id);
CREATE INDEX idx_user_generated_assets_created_at ON public.user_generated_assets(created_at DESC);

ALTER TABLE public.user_generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON public.user_generated_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON public.user_generated_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON public.user_generated_assets FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-generated', 'user-generated', false);

-- 3. Storage RLS: users can only read/write under their own folder {user_id}/...
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-generated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-generated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-generated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
