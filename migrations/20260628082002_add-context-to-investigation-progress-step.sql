-- Add 'context' to allowed steps in investigation_progress table
-- This allows storing Kubernetes context information in the progress section

DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE public.investigation_progress 
    DROP CONSTRAINT IF EXISTS investigation_progress_step_check;
    
    -- Add the updated constraint with 'context' included
    ALTER TABLE public.investigation_progress
    ADD CONSTRAINT investigation_progress_step_check
    CHECK (step IN ('pods','logs','events','deployments','network','ai_reasoning','complete','context'));
    
    RAISE NOTICE 'Updated investigation_progress.step check constraint to include ''context''';
END $$;

-- Add comment for clarity
COMMENT ON CONSTRAINT investigation_progress_step_check ON public.investigation_progress IS 
    'Check constraint ensuring step is one of the valid investigation process steps including context';
