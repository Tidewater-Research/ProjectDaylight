import OpenAI from 'openai'

interface VoiceExtractionBody {
  transcript?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.openai?.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.'
    })
  }

  const body = await readBody<VoiceExtractionBody>(event)
  const transcript = body?.transcript?.trim()

  if (!transcript) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Transcript is required for extraction.'
    })
  }

  try {
    const recordingTimestampIso = new Date().toISOString()

    const openai = new OpenAI({
      apiKey: config.openai.apiKey
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are an extraction engine for Project Daylight.',
            'Given a voice note transcript from a parent in a custody situation, you must extract factual, legally relevant information only.',
            'Do not provide advice, opinions, or legal conclusions.',
            '',
            `Assume the voice note was recorded at this timestamp (ISO-8601, server time): ${recordingTimestampIso}.`,
            'Unless the user clearly specifies a different calendar date, assume their description refers to events occurring on the same calendar day as this recording timestamp.',
            'When the user gives a time like "at 10am" or "around 3:30 PM", construct an ISO-8601 primary_timestamp using that time on the recording date. Set seconds to 0 and preserve the timezone from the recording timestamp.',
            'For relative phrases like "this morning", "tonight", or "earlier today", choose a reasonable time on that same day and set timestamp_precision to "approximate".',
            'If you cannot reasonably resolve a date or time, leave primary_timestamp as null and set timestamp_precision to "unknown".',
            '',
            'Return a single JSON object that matches this structure:',
            '{',
            '  "extraction": {',
            '    "events": [',
            '      {',
            '        "type": "incident|positive|medical|school|communication|legal",',
            '        "title": "Brief factual summary",',
            '        "description": "Detailed factual narrative",',
            '        "primary_timestamp": "ISO-8601 string or null if unknown",',
            '        "timestamp_precision": "exact|day|approximate|unknown",',
            '        "duration_minutes": number|null,',
            '        "location": "string or null",',
            '        "participants": {',
            '          "primary": [ "co-parent|child|self|other" ],',
            '          "witnesses": [ "string" ],',
            '          "professionals": [ "string" ]',
            '        },',
            '        "child_involved": boolean,',
            '        "evidence_mentioned": [',
            '          {',
            '            "type": "text|email|photo|document|recording",',
            '            "description": "string",',
            '            "status": "have|need_to_get|need_to_create"',
            '          }',
            '        ],',
            '        "patterns_noted": [ "string" ],',
            '        "custody_relevance": {',
            '          "agreement_violation": boolean|null,',
            '          "safety_concern": boolean|null,',
            '          "welfare_impact": "none|minor|moderate|significant|positive|unknown"',
            '        }',
            '      }',
            '    ],',
            '    "action_items": [',
            '      {',
            '        "priority": "urgent|high|normal|low",',
            '        "type": "document|contact|file|obtain|other",',
            '        "description": "string",',
            '        "deadline": "string or null"',
            '      }',
            '    ],',
            '    "metadata": {',
            '      "recording_timestamp": "ISO-8601 string or null",',
            '      "recording_duration_seconds": number|null,',
            '      "transcription_confidence": number|null,',
            '      "extraction_confidence": number|null,',
            '      "ambiguities": [ "string" ]',
            '    }',
            '  }',
            '}',
            '',
            'Rules:',
            '- If a field is unknown or not mentioned, set it to null, an empty array, or "unknown" where appropriate.',
            '- Prefer under-extraction to guessing. Do not invent details.',
            '- Keep tone neutral and factual.',
            '- You may extract multiple events from a single transcript.',
            `- When metadata.recording_timestamp is not otherwise clearly specified by the user, you may set it to the recording timestamp provided above: ${recordingTimestampIso}.`
          ].join('\n')
        },
        {
          role: 'user',
          content: transcript
        }
      ]
    })

    const content = completion.choices[0]?.message?.content
    const usage = completion.usage ?? null

    if (!content) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Extraction model returned an empty response.'
      })
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(content)
    } catch {
      // If the model returned something non-JSON despite the response_format,
      // wrap it in a simple envelope so the UI still shows something useful.
      parsed = {
        raw: content,
        error: 'Model response was not valid JSON. Please try again.'
      }
    }

    let payload: any = parsed

    if (!payload || typeof payload !== 'object') {
      payload = { raw: payload }
    }

    // Attach token usage information from OpenAI
    payload._usage = usage

    // Optionally compute a cost estimate in USD if per-1K token rates are provided via env
    // OPENAI_GPT5_MINI_INPUT_RATE_USD_PER_1K_TOKENS and OPENAI_GPT5_MINI_OUTPUT_RATE_USD_PER_1K_TOKENS
    let costEstimateUsd: number | null = null

    if (usage) {
      const inputRatePer1K = Number(process.env.OPENAI_GPT5_MINI_INPUT_RATE_USD_PER_1K_TOKENS || '0')
      const outputRatePer1K = Number(process.env.OPENAI_GPT5_MINI_OUTPUT_RATE_USD_PER_1K_TOKENS || '0')

      if (inputRatePer1K > 0 || outputRatePer1K > 0) {
        const inputTokens = usage.prompt_tokens ?? 0
        const outputTokens = usage.completion_tokens ?? 0

        const inputCost = inputRatePer1K > 0 ? (inputTokens / 1000) * inputRatePer1K : 0
        const outputCost = outputRatePer1K > 0 ? (outputTokens / 1000) * outputRatePer1K : 0

        costEstimateUsd = Number((inputCost + outputCost).toFixed(6))
      }

      payload._cost = {
        model: 'gpt-5-mini',
        currency: 'USD',
        total_usd: costEstimateUsd,
        input_rate_per_1k: process.env.OPENAI_GPT5_MINI_INPUT_RATE_USD_PER_1K_TOKENS || null,
        output_rate_per_1k: process.env.OPENAI_GPT5_MINI_OUTPUT_RATE_USD_PER_1K_TOKENS || null
      }
    }

    return payload
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Voice extraction error:', error)

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
      statusMessage: 'Failed to extract structured information from transcript. Please try again.'
    })
  }
})


