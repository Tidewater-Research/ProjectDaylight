import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

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
    const extraction = response.output_parsed
    const usage = response.usage ?? null

    if (!extraction) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Extraction model returned an empty response.'
      })
    }

    let payload: any = extraction

    // Attach token usage information from OpenAI, mirroring voice-extraction.
    payload._usage = usage

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


