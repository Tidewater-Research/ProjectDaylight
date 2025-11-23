import OpenAI from 'openai'

interface EvidenceCommunicationExtractBody {
  /**
   * URL or data URL for the screenshot/image that OpenAI can fetch.
   * For the capture page demo we send a data URL (base64) generated from a local file,
   * so we don't need to store the image in Supabase first.
   */
  imageUrl: string
}

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
     * Use the Responses API so we can accept an image + text instructions and
     * ask for a JSON object matching the communications evidence schema.
     *
     * The model should:
     * - Do OCR on the image.
     * - Infer medium (text vs email) when possible.
     * - Produce a single JSON object with the "extraction" envelope described
     *   in docs/evidence_communications_schema.md.
     */
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      // In the Responses API, JSON-style output is requested via text.format.
      // The format field itself is an object, mirroring the old response_format shape.
      text: {
        format: { type: 'json_object' }
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
                'Return a SINGLE JSON object with this structure:',
                '{',
                '  "extraction": {',
                '    "communications": [',
                '      {',
                '        "medium": "text|email|unknown",',
                '        "direction": "incoming|outgoing|mixed|unknown",',
                '        "subject": "string or null",',
                '        "summary": "1–2 sentence neutral summary",',
                '        "body_text": "text content from the image",',
                '        "participants": {',
                '          "from": "string or null",',
                '          "to": ["string"],',
                '          "others": ["string"]',
                '        },',
                '        "sent_at": "ISO-8601 string or null",',
                '        "timestamp_precision": "exact|approximate|unknown",',
                '        "child_involved": boolean | null,',
                '        "agreement_violation": boolean | null,',
                '        "safety_concern": boolean | null,',
                '        "welfare_impact": "none|minor|moderate|significant|positive|unknown"',
                '      }',
                '    ],',
                '    "db_suggestions": {',
                '      "events": [',
                '        {',
                '          "type": "communication",',
                '          "title": "Short neutral title",',
                '          "description": "Factual description suitable for the timeline",',
                '          "primary_timestamp": "ISO-8601 string or null",',
                '          "timestamp_precision": "exact|day|approximate|unknown",',
                '          "duration_minutes": number | null,',
                '          "location": "string or null",',
                '          "child_involved": boolean | null,',
                '          "agreement_violation": boolean | null,',
                '          "safety_concern": boolean | null,',
                '          "welfare_impact": "none|minor|moderate|significant|positive|unknown"',
                '        }',
                '      ],',
                '      "evidence": [',
                '        {',
                '          "source_type": "text|email|photo|document|recording|other",',
                '          "summary": "Suggested summary for evidence.summary",',
                '          "tags": ["communication", "optional additional tags"]',
                '        }',
                '      ]',
                '    },',
                '    "metadata": {',
                '      "image_analysis_confidence": number | null,',
                '      "raw_ocr_text": "string with best-effort OCR",',
                '      "ambiguities": ["string notes about anything uncertain"]',
                '    }',
                '  }',
                '}',
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
              text: 'Here is the communication evidence screenshot. Extract it into the JSON structure described above.'
            },
            {
              type: 'input_image',
              // Pass a data URL string directly (e.g. data:image/jpeg;base64,...) as in the
              // official Responses API examples.
              image_url: imageUrl
            }
          ]
        }
      ]
    })

    // For JSON output we can use the convenience accessor output_text, which
    // will be the text content produced by the model. Since we requested
    // text.format = 'json_object', this should be a JSON string.
    const text = (response as any).output_text ?? null
    const usage = response.usage ?? null

    if (!text) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Extraction model returned an empty response.'
      })
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = {
        raw: text,
        error: 'Model response was not valid JSON. Please try again.'
      }
    }

    let payload: any = parsed

    if (!payload || typeof payload !== 'object') {
      payload = { raw: payload }
    }

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
        model: 'gpt-4.1-mini',
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


