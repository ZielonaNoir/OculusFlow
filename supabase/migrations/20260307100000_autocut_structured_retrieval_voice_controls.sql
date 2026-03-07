BEGIN;

ALTER TABLE public.autocut_projects
  ADD COLUMN IF NOT EXISTS voice_character text NOT NULL DEFAULT 'anna',
  ADD COLUMN IF NOT EXISTS voice_style text NOT NULL DEFAULT 'cinematic_narration';

ALTER TABLE public.autocut_segments
  ADD COLUMN IF NOT EXISTS retrieval_intent text,
  ADD COLUMN IF NOT EXISTS retrieval_subject text,
  ADD COLUMN IF NOT EXISTS retrieval_mood text,
  ADD COLUMN IF NOT EXISTS retrieval_queries jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retrieval_negative_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retrieval_visual_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS voice_emotion text,
  ADD COLUMN IF NOT EXISTS voice_pace text,
  ADD COLUMN IF NOT EXISTS voice_intensity text;

ALTER TABLE public.autocut_segments
  ADD CONSTRAINT autocut_segments_retrieval_intent_check
    CHECK (retrieval_intent IS NULL OR retrieval_intent IN ('quote_scene', 'reaction_closeup', 'action_chase', 'city_establishing', 'emotional_broll', 'generic_broll'));

ALTER TABLE public.autocut_segments
  ADD CONSTRAINT autocut_segments_retrieval_mood_check
    CHECK (retrieval_mood IS NULL OR retrieval_mood IN ('tense', 'determined', 'lonely', 'inspirational', 'warm', 'neutral'));

ALTER TABLE public.autocut_segments
  ADD CONSTRAINT autocut_segments_voice_emotion_check
    CHECK (voice_emotion IS NULL OR voice_emotion IN ('neutral', 'determined', 'tense', 'warm', 'urgent'));

ALTER TABLE public.autocut_segments
  ADD CONSTRAINT autocut_segments_voice_pace_check
    CHECK (voice_pace IS NULL OR voice_pace IN ('slow', 'medium', 'fast'));

ALTER TABLE public.autocut_segments
  ADD CONSTRAINT autocut_segments_voice_intensity_check
    CHECK (voice_intensity IS NULL OR voice_intensity IN ('low', 'medium', 'high'));

COMMIT;
