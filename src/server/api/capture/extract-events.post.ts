import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/capture/extract-events
 * 
 * Extracts structured events from the user's event description.
 * This is called AFTER evidence has been processed.
 * 
 * The LLM receives:
 * - The user's event text (voice transcript or typed description)
 * - Reference date for temporal reasoning
 * - Summaries from processed evidence
 * - Case context
 * 
 * It produces structured events that match the events table schema.
 */

interface EvidenceSummary {
  evidenceId: string | null
  annotation: string
  summary: string
}

interface ExtractEventsBody {
  eventText: string
  referenceDate?: string
  evidenceSummaries?: EvidenceSummary[]
}

// Zod schemas matching the existing voice-extraction schema
const ParticipantsSchema = z.object({
  primary: z.array(z.enum(['co-parent', 'child', 'self', 'other'])).describe('Primary participants'),
  witnesses: z.array(z.string()).describe('Witnesses present'),
  professionals: z.array(z.string()).describe('Professionals involved')
})

const CustodyRelevanceSchema = z.object({
  agreement_violation: z.boolean().nullable().describe('Whether this violates a custody agreement'),
  safety_concern: z.boolean().nullable().describe('Whether there are safety concerns'),
  welfare_impact: z.enum(['none', 'minor', 'moderate', 'significant', 'positive', 'unknown']).describe('Impact on child welfare')
})

const EvidenceMentionedSchema = z.object({
  type: z.enum(['text', 'email', 'photo', 'document', 'recording', 'other']).describe('Type of evidence'),
  description: z.string().describe('Description of the evidence'),
  status: z.enum(['have', 'need_to_get', 'need_to_create']).describe('Current status of the evidence')
})

const EventSchema = z.object({
  type: z.enum(['incident', 'positive', 'medical', 'school', 'communication', 'legal']).describe('Type of event'),
  title: z.string().describe('Brief factual summary'),
  description: z.string().describe('Detailed factual narrative'),
  primary_timestamp: z.string().nullable().describe('ISO-8601 timestamp or null if unknown'),
  timestamp_precision: z.enum(['exact', 'day', 'approximate', 'unknown']).describe('How precise the timestamp is'),
  duration_minutes: z.number().nullable().describe('Duration in minutes if applicable'),
  location: z.string().nullable().describe('Location where event occurred'),
  participants: ParticipantsSchema,
  child_involved: z.boolean().describe('Whether a child was involved'),
  evidence_mentioned: z.array(EvidenceMentionedSchema),
  patterns_noted: z.array(z.string()),
  custody_relevance: CustodyRelevanceSchema
})

const ActionItemSchema = z.object({
  priority: z.enum(['urgent', 'high', 'normal', 'low']).describe('Priority level'),
  type: z.enum(['document', 'contact', 'file', 'obtain', 'other']).describe('Type of action'),
  description: z.string().describe('Description of the action item'),
  deadline: z.string().nullable().describe('Deadline for the action')
})

const MetadataSchema = z.object({
  extraction_confidence: z.number().nullable().describe('Confidence score for extraction'),
  ambiguities: z.array(z.string()).describe('Notes about ambiguous elements')
})

const ExtractionSchema = z.object({
  extraction: z.object({
    events: z.array(EventSchema).describe('Extracted events'),
    action_items: z.array(ActionItemSchema).describe('Action items identified'),
    metadata: MetadataSchema
  })
})

type ExtractionResult = z.infer<typeof ExtractionSchema>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.openai?.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key is not configured.'
    })
  }

  const body = await readBody<ExtractEventsBody>(event)
  const eventText = body?.eventText?.trim()
  const referenceDate = body?.referenceDate?.trim()
  const evidenceSummaries = body?.evidenceSummaries || []

  if (!eventText) {
    throw createError({
      statusCode: 400,
      statusMessage: 'eventText is required.'
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Get authenticated user
  const authUser = await serverSupabaseUser(event)
  const userId = authUser?.sub || authUser?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Please log in'
    })
  }

  try {
    // Load user profile
    let userDisplayName: string | null = null
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.full_name) {
      userDisplayName = profile.full_name
    }

    // Load case context
    let caseContext = 'The speaker is involved in a family court / custody / divorce matter.'

    const { data: caseRow } = await supabase
      .from('cases')
      .select('case_type, stage, your_role, opposing_party_name, goals_summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (caseRow) {
      const parts: string[] = []
      if (caseRow.case_type) parts.push(`case type: ${caseRow.case_type}`)
      if (caseRow.your_role) parts.push(`your role: ${caseRow.your_role}`)
      if (caseRow.stage) parts.push(`stage: ${caseRow.stage}`)
      if (caseRow.opposing_party_name) parts.push(`opposing party: ${caseRow.opposing_party_name}`)
      if (caseRow.goals_summary) parts.push(`user goals: ${caseRow.goals_summary}`)
      if (parts.length) {
        caseContext = `The speaker is involved in a family law matter: ${parts.join('; ')}.`
      }
    }

    // Build temporal guidance
    let recordingTimestampIso: string
    if (referenceDate) {
      const parsed = new Date(referenceDate)
      if (!Number.isNaN(parsed.getTime())) {
        recordingTimestampIso = parsed.toISOString()
      } else {
        recordingTimestampIso = new Date().toISOString()
      }
    } else {
      recordingTimestampIso = new Date().toISOString()
    }

    const temporalGuidance = [
      `The reference date for these events is: ${recordingTimestampIso}`,
      'Resolve relative time references (like "yesterday", "this morning") based on this date.',
      'If you cannot determine a specific time, set timestamp_precision to "approximate" or "unknown".'
    ].join('\n')

    // Build evidence context section
    let evidenceContext = ''
    if (evidenceSummaries.length > 0) {
      const evidenceLines = evidenceSummaries.map((e, i) => {
        let line = `Evidence ${i + 1}:`
        if (e.annotation) line += `\n  User's note: "${e.annotation}"`
        if (e.summary) line += `\n  Analysis: ${e.summary}`
        return line
      })
      evidenceContext = [
        '',
        '## Attached Evidence',
        'The user has attached the following evidence to support their description:',
        '',
        ...evidenceLines,
        '',
        'Use information from this evidence to enhance the accuracy of extracted events.',
        'Reference specific details (timestamps, quotes, facts) from the evidence when relevant.'
      ].join('\n')
    }

    const speakerLine = userDisplayName
      ? `The speaker is ${userDisplayName}. When they say "I" or "me", they refer to ${userDisplayName}.`
      : 'The speaker is the user. References to "I" or "me" refer to the same person.'

    const systemPrompt = [
      'You are an extraction engine for Project Daylight.',
      'Given a description of events from a parent in a custody situation, extract factual, legally relevant information.',
      'Do not provide advice, opinions, or legal conclusions.',
      '',
      speakerLine,
      caseContext,
      '',
      temporalGuidance,
      evidenceContext,
      '',
      'Rules:',
      '- Extract facts, not interpretations or emotions.',
      '- If information is unknown, use null or "unknown" appropriately.',
      '- Prefer under-extraction to guessing.',
      '- Keep tone neutral and factual.',
      '- You may extract multiple events from a single description.',
      '- Cross-reference the attached evidence to corroborate details.'
    ].join('\n')

    const openai = new OpenAI({
      apiKey: config.openai.apiKey
    })

    const response = await openai.responses.parse({
      model: 'gpt-5-mini',
      text: {
        format: zodTextFormat(ExtractionSchema, 'extraction')
      },
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: eventText }]
        }
      ]
    })

    const extraction = response.output_parsed as ExtractionResult

    if (!extraction) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Event extraction returned empty response.'
      })
    }

    return {
      extraction: extraction.extraction,
      _usage: response.usage
    }
  } catch (error: any) {
    console.error('Event extraction error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to extract events. Please try again.'
    })
  }
})

