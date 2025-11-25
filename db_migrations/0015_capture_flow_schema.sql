-- Migration: 0015_capture_flow_schema.sql
-- Description: Add columns and table to support the new capture flow where:
--   1. User captures an event (voice/text)
--   2. User optionally attaches evidence with annotations
--   3. Backend processes evidence first, then extracts events using evidence summaries
--
-- Changes:
--   - Add user_annotation column to evidence table (user's blurb about the evidence)
--   - Add extraction_raw column to evidence table (LLM's structured analysis)
--   - Create captures table to track pending capture sessions

-- =============================================================================
-- 1. Add columns to evidence table
-- =============================================================================

-- user_annotation: The note/blurb the user provides about what the evidence is
-- or why it's significant. This gives the LLM context when analyzing the file.
ALTER TABLE public.evidence
ADD COLUMN IF NOT EXISTS user_annotation text;

COMMENT ON COLUMN public.evidence.user_annotation IS 
  'User-provided note about what this evidence shows or why it is significant. Gives context to the LLM during extraction.';

-- extraction_raw: The LLM's structured analysis of the evidence file.
-- This is populated after the evidence is processed and before event extraction.
ALTER TABLE public.evidence
ADD COLUMN IF NOT EXISTS extraction_raw jsonb;

COMMENT ON COLUMN public.evidence.extraction_raw IS 
  'Structured JSON output from LLM analysis of the evidence file. Contains extracted facts, timestamps, quotes, etc.';


-- =============================================================================
-- 2. Create capture_status enum
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capture_status') THEN
    CREATE TYPE public.capture_status AS ENUM (
      'draft',           -- User is still adding content/evidence
      'processing',      -- Backend is processing evidence and extracting events
      'review',          -- Extraction complete, awaiting user review
      'completed',       -- User confirmed, events saved to timeline
      'cancelled'        -- User cancelled the capture
    );
  END IF;
END
$$;


-- =============================================================================
-- 3. Create captures table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- The event description (voice transcript or typed text)
  -- We only store the text, not the original audio
  event_text text,
  
  -- Reference date for temporal reasoning (when did these events happen?)
  reference_date date,
  reference_time_description text,
  
  -- Processing state
  status public.capture_status NOT NULL DEFAULT 'draft',
  
  -- Raw extraction result from the event processing step
  extraction_raw jsonb,
  
  -- Error message if processing failed
  processing_error text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS captures_user_id_idx ON public.captures(user_id);
CREATE INDEX IF NOT EXISTS captures_status_idx ON public.captures(status);
CREATE INDEX IF NOT EXISTS captures_user_status_idx ON public.captures(user_id, status);

-- Enable RLS
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own captures
CREATE POLICY captures_select_own ON public.captures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY captures_insert_own ON public.captures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY captures_update_own ON public.captures
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY captures_delete_own ON public.captures
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 4. Create capture_evidence junction table
-- =============================================================================
-- Links evidence items to a capture session. Each evidence item can have
-- its own annotation and processing status within the capture context.

CREATE TABLE IF NOT EXISTS public.capture_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id uuid NOT NULL REFERENCES public.captures(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
  
  -- Order in which evidence was added (for display/processing)
  sort_order integer NOT NULL DEFAULT 0,
  
  -- Whether this evidence has been processed by the LLM
  is_processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure each evidence item is only linked once per capture
  UNIQUE(capture_id, evidence_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS capture_evidence_capture_id_idx ON public.capture_evidence(capture_id);
CREATE INDEX IF NOT EXISTS capture_evidence_evidence_id_idx ON public.capture_evidence(evidence_id);

-- Enable RLS
ALTER TABLE public.capture_evidence ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can access capture_evidence through their captures
CREATE POLICY capture_evidence_select_own ON public.capture_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.captures c 
      WHERE c.id = capture_evidence.capture_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY capture_evidence_insert_own ON public.capture_evidence
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captures c 
      WHERE c.id = capture_evidence.capture_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY capture_evidence_update_own ON public.capture_evidence
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.captures c 
      WHERE c.id = capture_evidence.capture_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY capture_evidence_delete_own ON public.capture_evidence
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.captures c 
      WHERE c.id = capture_evidence.capture_id 
      AND c.user_id = auth.uid()
    )
  );


-- =============================================================================
-- 5. Add updated_at trigger for captures table
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_captures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS captures_updated_at_trigger ON public.captures;
CREATE TRIGGER captures_updated_at_trigger
  BEFORE UPDATE ON public.captures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_captures_updated_at();


-- =============================================================================
-- 6. Comments
-- =============================================================================

COMMENT ON TABLE public.captures IS 
  'Pending capture sessions. Tracks the state of event capture from initial input through evidence processing to final event creation.';

COMMENT ON TABLE public.capture_evidence IS 
  'Junction table linking evidence items to capture sessions. Tracks processing status for each piece of evidence within a capture.';

