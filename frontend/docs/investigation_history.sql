-- investigation_history table for storing AI Kubernetes investigation results
-- Run this in your InsForge SQL editor or via the CLI

CREATE TABLE IF NOT EXISTS public.investigation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  namespace TEXT NOT NULL DEFAULT 'default',
  root_cause TEXT NOT NULL,
  explanation TEXT,
  fix TEXT,
  kubectl_command TEXT,
  prevention TEXT,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  raw_diagnostics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.investigation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own investigations
CREATE POLICY "Users can view own investigations"
  ON public.investigation_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own investigations
CREATE POLICY "Users can insert own investigations"
  ON public.investigation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_investigation_history_user_id
  ON public.investigation_history (user_id);

CREATE INDEX IF NOT EXISTS idx_investigation_history_created_at
  ON public.investigation_history (created_at DESC);

-- Optional: Grant permissions
GRANT SELECT, INSERT ON public.investigation_history TO authenticated;