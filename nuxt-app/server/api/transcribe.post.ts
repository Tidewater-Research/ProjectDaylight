export default defineEventHandler(async (_event) => {
  // In the future, you'll read the uploaded audio from the request and run LLM-based transcription here.
  // For now, we wait a bit then return a static dummy response so the UI can exercise the full request flow.

  // Simulate processing delay (2 seconds)
  await new Promise((resolve) => {
    setTimeout(resolve, 2000)
  })

  return {
    transcript: 'This is a dummy transcript returned from /api/transcribe. Replace this with real LLM output later.'
  }
})


