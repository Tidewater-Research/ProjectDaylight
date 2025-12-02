import { Inngest } from 'inngest'
import { serve } from 'inngest/h3'
import { eventHandler } from 'h3'
import { inngest } from '../inngest/client'
import { testJob, journalExtractionFunction } from '../inngest/functions'

// Create the Inngest serve handler
const handler = serve({
  client: inngest,
  functions: [
    testJob,
    journalExtractionFunction
  ]
})

// Wrap with eventHandler to avoid deprecation warning
export default eventHandler(handler)

