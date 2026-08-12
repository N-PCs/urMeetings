
-- Bots table (urBrief AI meeting bots dispatched via Meeting BaaS)
CREATE TABLE public.bots (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'urBrief',
  meeting_url TEXT,
  meeting_name TEXT,
  meeting_platform TEXT DEFAULT 'unknown',
  bot_status TEXT NOT NULL DEFAULT 'creating',
  recording_url TEXT,
  recording_status TEXT,
  transcript_url TEXT,
  transcript_status TEXT,
  transcript TEXT,
  summary TEXT,
  title TEXT,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  speakers JSONB,
  error_message TEXT,
  meeting_id UUID,
  joined_at TIMESTAMP WITH TIME ZONE,
  webpage_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX bots_user_id_idx ON public.bots(user_id);
CREATE INDEX bots_created_at_idx ON public.bots(created_at DESC);
CREATE INDEX bots_status_idx ON public.bots(bot_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT ALL ON public.bots TO service_role;

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bots"
  ON public.bots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bots"
  ON public.bots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bots"
  ON public.bots FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bots"
  ON public.bots FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at (shared helper already defined in the meetings migration)
CREATE TRIGGER bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
