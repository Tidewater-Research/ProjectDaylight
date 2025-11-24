-- 0013_event_evidence_suggestions_fulfillment.sql
-- Project Daylight - Incremental updates for AI-suggested evidence
--
-- This migration assumes that 0012_event_evidence_suggestions.sql has already run
-- and that the table public.event_evidence_suggestions exists without the
-- fulfillment / dismissal fields.
--
-- It adds:
-- - fulfilled_evidence_id (FK to evidence)
-- - fulfilled_at (timestamp)
-- - dismissed_at (timestamp)
--
-- Run this in your Supabase project's SQL editor after 0012.

------------------------------------------------------------
-- Add fulfillment / dismissal fields
------------------------------------------------------------

alter table public.event_evidence_suggestions
  add column fulfilled_evidence_id uuid references public.evidence (id) on delete set null;

alter table public.event_evidence_suggestions
  add column fulfilled_at timestamptz;

alter table public.event_evidence_suggestions
  add column dismissed_at timestamptz;



