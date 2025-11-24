import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface EvidenceCommunicationExtractBody {
  /**
   * URL or data URL for the screenshot/image that OpenAI can fetch.
   * For the capture page demo we send a data URL (base64) generated from a local file,
   * so we don't need to store the image in Supabase first.
   */
  imageUrl: string
}

// Define Zod schema for structured extraction
const CommunicationSchema = z.object({
  medium: z.enum(['text', 'email', 'unknown']).describe('The medium of communication'),
  direction: z.enum(['incoming', 'outgoing', 'mixed', 'unknown']).describe('The direction of communication'),
  subject: z.string().nullable().describe('Subject line if applicable (e.g., email)'),
  summary: z.string().describe('1–2 sentence neutral summary of the communication'),
  body_text: z.string().describe('The actual text content extracted from the image'),
  participants: z.object({
    from: z.string().nullable().describe('Sender of the communication'),
    to: z.array(z.string()).describe('Recipients of the communication'),
    others: z.array(z.string()).describe('Other participants mentioned or involved')
  }),
  sent_at: z.string().nullable().describe('ISO-8601 timestamp when the communication was sent'),
  timestamp_precision: z.enum(['exact', 'approximate', 'unknown']).describe('How precise the timestamp is'),
  child_involved: z.boolean().nullable().describe('Whether a child was involved in this communication'),
  agreement_violation: z.boolean().nullable().describe('Whether this appears to violate an agreement'),
  safety_concern: z.boolean().nullable().describe('Whether there are safety concerns'),
  welfare_impact: z.enum(['none', 'minor', 'moderate', 'significant', 'positive', 'unknown']).describe('Impact on welfare')
})

const EventSuggestionSchema = z.object({
  type: z.literal('communication').describe('Type of event'),
  title: z.string().describe('Short neutral title for the event'),
  description: z.string().describe('Factual description suitable for the timeline'),
  primary_timestamp: z.string().nullable().describe('ISO-8601 timestamp for the event'),
  timestamp_precision: z.enum(['exact', 'day', 'approximate', 'unknown']).describe('Precision of the timestamp'),
  duration_minutes: z.number().nullable().describe('Duration in minutes if applicable'),
  location: z.string().nullable().describe('Location if mentioned'),
  child_involved: z.boolean().nullable().describe('Whether a child was involved'),
  agreement_violation: z.boolean().nullable().describe('Whether this violates an agreement'),
  safety_concern: z.boolean().nullable().describe('Whether there are safety concerns'),
  welfare_impact: z.enum(['none', 'minor', 'moderate', 'significant', 'positive', 'unknown']).describe('Impact on welfare')
})

const EvidenceSuggestionSchema = z.object({
  source_type: z.enum(['text', 'email', 'photo', 'document', 'recording', 'other']).describe('Type of evidence source'),
  summary: z.string().describe('Suggested summary for evidence.summary field'),
  tags: z.array(z.string()).describe('Suggested tags for categorization')
})

const ExtractionSchema = z.object({
  extraction: z.object({
    communications: z.array(CommunicationSchema).describe('Array of extracted communications'),
    db_suggestions: z.object({
      events: z.array(EventSuggestionSchema).describe('Suggested events for the database'),
      evidence: z.array(EvidenceSuggestionSchema).describe('Suggested evidence records for the database')
    }),
    metadata: z.object({
      image_analysis_confidence: z.number().nullable().describe('Confidence score for the image analysis'),
      raw_ocr_text: z.string().describe('Raw OCR text extracted from the image'),
      ambiguities: z.array(z.string()).describe('Notes about uncertain or ambiguous elements')
    })
  })
})

type ExtractionResult = z.infer<typeof ExtractionSchema>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.openai?.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.'
    })
  }

  const body = await readBody<EvidenceCommunicationExtractBody>(event)
  const imageUrl = body?.imageUrl?.trim()

  if (!imageUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'imageUrl is required and must be a non-empty string.'
    })
  }

  try {
    const openai = new OpenAI({
      apiKey: config.openai.apiKey
    })

    /**
     * Use the Responses API with structured output parsing via Zod schemas.
     * This provides type-safe validation and automatic JSON parsing.
     *
     * The model will:
     * - Do OCR on the image.
     * - Infer medium (text vs email) when possible.
     * - Produce a validated JSON object matching the communications evidence schema.
     */
    const response = await openai.responses.parse({
      model: 'gpt-5-mini',
      text: {
        format: zodTextFormat(ExtractionSchema, 'extraction')
      },
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                'You are an AI extraction engine for Project Daylight.',
                'You receive a single image URL that is a screenshot or photo of communication evidence (typically text messages or emails).',
                '',
                'Your job is to:',
                '- Perform OCR on the image to recover the text.',
                '- Identify whether this looks like a text/chat conversation or an email.',
                '- Extract a neutral, factual summary of what the communication shows.',
                '- Suggest simple event and evidence payloads that fit the existing database schema.',
                '',
                'Rules:',
                '- If a field is unknown or not visible, prefer null, "unknown", or an empty array instead of guessing.',
                '- Keep tone neutral and factual.',
                '- Do not provide legal advice or opinions.',
                '- Align values with the allowed enums where specified.',
                '- It is okay if there is only one communication and one suggested event/evidence object.',
              ].join('\n')
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Here is the communication evidence screenshot. Extract it into the structured format.'
            },
            {
              type: 'input_image',
              image_url: imageUrl,
              detail: 'high' // Use 'high' detail for better OCR quality
            }
          ]
        }
      ]
    })

    // Use the parsed output from the Zod schema
    const extraction = response.output_parsed as ExtractionResult
    const usage = response.usage ?? null

    if (!extraction) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Extraction model returned an empty response.'
      })
    }

    const supabase = await serverSupabaseServiceRole(event)

    // Resolve the authenticated user.
    // Prefer the Supabase access token sent in the Authorization header,
    // but fall back to cookie-based auth via serverSupabaseUser for flexibility.
    let userId: string | null = null

    const authHeader = getHeader(event, 'authorization') || getHeader(event, 'Authorization')
    const bearerPrefix = 'Bearer '
    const token = authHeader?.startsWith(bearerPrefix)
      ? authHeader.slice(bearerPrefix.length).trim()
      : undefined

    if (token) {
      const { data: userResult, error: userError } = await supabase.auth.getUser(token)

      if (userError) {
        // eslint-disable-next-line no-console
        console.error('Supabase auth.getUser error (communications extraction):', userError)
      } else {
        userId = userResult.user?.id ?? null
      }
    }

    if (!userId) {
      const authUser = await serverSupabaseUser(event)
      userId = authUser?.id ?? null
    }

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User is not authenticated. Please sign in through Supabase and include the session token in the request.'
      })
    }

    const communications = extraction.extraction?.communications ?? []
    const dbSuggestions = extraction.extraction?.db_suggestions

    const createdCommunicationIds: string[] = []
    const createdEventIds: string[] = []
    const createdEvidenceIds: string[] = []

    if (communications.length) {
      const communicationsToInsert = communications.map((comm) => ({
        user_id: userId,
        medium: comm.medium,
        direction: comm.direction,
        subject: comm.subject,
        summary: comm.summary,
        body_text: comm.body_text,
        from_identity: comm.participants?.from ?? null,
        to_identities: comm.participants?.to ?? [],
        other_participants: comm.participants?.others ?? [],
        sent_at: comm.sent_at ?? null,
        timestamp_precision: comm.timestamp_precision ?? 'unknown',
        child_involved: comm.child_involved ?? null,
        agreement_violation: comm.agreement_violation ?? null,
        safety_concern: comm.safety_concern ?? null,
        welfare_impact: comm.welfare_impact ?? 'unknown'
      }))

      const { data: insertedCommunications, error: communicationsError } = await supabase
        .from('communications')
        .insert(communicationsToInsert)
        .select('id')

      if (communicationsError) {
        // eslint-disable-next-line no-console
        console.error('Failed to insert communications from evidence extraction:', communicationsError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to save extracted communications.'
        })
      }

      for (const row of insertedCommunications ?? []) {
        createdCommunicationIds.push(row.id as string)
      }
    }

    if (dbSuggestions?.evidence?.length) {
      const evidenceToInsert = dbSuggestions.evidence.map((ev) => ({
        user_id: userId,
        source_type: ev.source_type,
        storage_path: null,
        original_filename: null,
        mime_type: null,
        summary: ev.summary,
        tags: ev.tags ?? []
      }))

      const { data: insertedEvidence, error: evidenceError } = await supabase
        .from('evidence')
        .insert(evidenceToInsert)
        .select('id')

      if (evidenceError) {
        // eslint-disable-next-line no-console
        console.error('Failed to insert suggested evidence from communications extraction:', evidenceError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to save suggested evidence.'
        })
      }

      for (const row of insertedEvidence ?? []) {
        createdEvidenceIds.push(row.id as string)
      }
    }

    if (dbSuggestions?.events?.length) {
      const eventsToInsert = dbSuggestions.events.map((ev) => ({
        user_id: userId,
        recording_id: null,
        type: ev.type,
        title: ev.title || 'Communication event',
        description: ev.description || ev.title || '',
        primary_timestamp: ev.primary_timestamp ?? null,
        timestamp_precision: ev.timestamp_precision ?? 'unknown',
        duration_minutes: ev.duration_minutes ?? null,
        location: ev.location ?? null,
        child_involved: ev.child_involved ?? false,
        agreement_violation: ev.agreement_violation ?? null,
        safety_concern: ev.safety_concern ?? null,
        welfare_impact: ev.welfare_impact ?? 'unknown'
      }))

      const { data: insertedEvents, error: eventsError } = await supabase
        .from('events')
        .insert(eventsToInsert)
        .select('id')

      if (eventsError) {
        // eslint-disable-next-line no-console
        console.error('Failed to insert suggested events from communications extraction:', eventsError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to save suggested events.'
        })
      }

      for (const row of insertedEvents ?? []) {
        createdEventIds.push(row.id as string)
      }
    }

    // Best-effort linking between first created event/evidence and communications rows can be added later.

    let payload: any = extraction

    // Attach token usage information from OpenAI, mirroring voice-extraction.
    payload._usage = usage

    if (createdCommunicationIds.length || createdEventIds.length || createdEvidenceIds.length) {
      payload._db = {
        ...(payload._db || {}),
        created_communication_ids: createdCommunicationIds,
        created_event_ids: createdEventIds,
        created_evidence_ids: createdEvidenceIds
      }
    }

    let costEstimateUsd: number | null = null

    if (usage) {
      const inputRatePer1K = Number(process.env.OPENAI_GPT4_1_MINI_INPUT_RATE_USD_PER_1K_TOKENS || '0')
      const outputRatePer1K = Number(process.env.OPENAI_GPT4_1_MINI_OUTPUT_RATE_USD_PER_1K_TOKENS || '0')

      if (inputRatePer1K > 0 || outputRatePer1K > 0) {
        const inputTokens = usage.input_tokens ?? 0
        const outputTokens = usage.output_tokens ?? 0

        const inputCost = inputRatePer1K > 0 ? (inputTokens / 1000) * inputRatePer1K : 0
        const outputCost = outputRatePer1K > 0 ? (outputTokens / 1000) * outputRatePer1K : 0

        costEstimateUsd = Number((inputCost + outputCost).toFixed(6))
      }

      payload._cost = {
        model: 'gpt-5-mini',
        currency: 'USD',
        total_usd: costEstimateUsd,
        input_rate_per_1k: process.env.OPENAI_GPT4_1_MINI_INPUT_RATE_USD_PER_1K_TOKENS || null,
        output_rate_per_1k: process.env.OPENAI_GPT4_1_MINI_OUTPUT_RATE_USD_PER_1K_TOKENS || null
      }
    }

    return payload
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Evidence communication extraction error:', error)

    if (error?.status === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid OpenAI API key. Please check your configuration.'
      })
    }

    if (error?.status === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: 'OpenAI API rate limit exceeded. Please try again later.'
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to extract structured information from communication image. Please try again.'
    })
  }
})


