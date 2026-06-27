-- investigation_progress table for tracking real-time investigation steps
-- Supports long-running tasks and multi-user progress viewing

CREATE TABLE IF NOT EXISTS public.investigation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES public.investigation_history(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('pods','logs','events','deployments','network','ai_reasoning','complete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  message TEXT,
  payload JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.investigation_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view progress for their own investigations
CREATE POLICY "Users can view own investigation progress"
  ON public.investigation_progress
  FOR SELECT
  USING (
    investigation_id IN (
      SELECT id FROM public.investigation_history WHERE user_id = auth.uid()
    )
  );

-- Policy: System/backend can insert progress updates
CREATE POLICY "System can insert investigation progress"
  ON public.investigation_progress
  FOR INSERT
  WITH CHECK (true);

-- Policy: System/backend can update progress
CREATE POLICY "System can update investigation progress"
  ON public.investigation_progress
  FOR UPDATE
  USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_investigation_progress_investigation_id
  ON public.investigation_progress (investigation_id);

CREATE INDEX IF NOT EXISTS idx_investigation_progress_step
  ON public.investigation_progress (step);

CREATE INDEX IF NOT EXISTS idx_investigation_progress_created_at
  ON public.investigation_progress (created_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.investigation_progress TO authenticated;