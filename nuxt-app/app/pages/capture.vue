<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useObjectUrl } from '@vueuse/core'

const isSupported = ref(true)
const isRecording = ref(false)
const isSubmitting = ref(false)
const hasRecording = ref(false)
const transcript = ref('')
const error = ref<string | null>(null)

const recordingBlob = ref<Blob | null>(null)
const recordingUrl = useObjectUrl(recordingBlob)

let mediaRecorder: MediaRecorder | null = null
let chunks: BlobPart[] = []

const canTranscribe = computed(() => hasRecording.value && !isRecording.value && !isSubmitting.value)

onMounted(() => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    isSupported.value = false
    error.value = 'Audio recording is not supported in this browser.'
  }
})

onBeforeUnmount(() => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
})

async function startRecording() {
  if (!isSupported.value || isRecording.value) {
    return
  }

  error.value = null

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    chunks = []
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      recordingBlob.value = blob
      hasRecording.value = true

      // Stop all tracks so we release the microphone
      stream.getTracks().forEach(track => track.stop())
    }

    mediaRecorder.start()
    isRecording.value = true
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    error.value = 'Unable to access microphone. Please check your permissions and try again.'
    isRecording.value = false
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

async function toggleRecording() {
  if (!isSupported.value) {
    return
  }

  if (isRecording.value) {
    stopRecording()
  } else {
    await startRecording()
  }
}

async function sendForTranscription() {
  if (!recordingBlob.value || !canTranscribe.value) {
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('audio', recordingBlob.value, 'recording.webm')

    const response = await $fetch<{ transcript: string }>('/api/transcribe', {
      method: 'POST',
      body: formData as any
    })

    transcript.value = response.transcript
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    error.value = 'Failed to contact transcription service. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="capture">
    <template #header>
      <UDashboardNavbar title="Audio Capture Test">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-2xl w-full mx-auto space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="font-medium text-highlighted">
                  Quick capture sandbox
                </p>
                <p class="text-sm text-muted">
                  Record a short clip and send it to a dummy transcription endpoint.
                </p>
              </div>
              <UBadge v-if="isRecording" color="warning" variant="subtle">
                Recording…
              </UBadge>
              <UBadge v-else-if="hasRecording" color="info" variant="subtle">
                Ready to transcribe
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <ClientOnly>
              <div class="flex flex-wrap items-center gap-3">
                <UButton
                  :color="isRecording ? 'error' : 'primary'"
                  :icon="isRecording ? 'i-lucide-square' : 'i-lucide-mic'"
                  :variant="isRecording ? 'solid' : 'solid'"
                  size="lg"
                  :disabled="!isSupported"
                  @click="toggleRecording"
                >
                  <span v-if="isRecording">
                    Stop recording
                  </span>
                  <span v-else>
                    Start recording
                  </span>
                </UButton>

                <UButton
                  color="neutral"
                  variant="outline"
                  :loading="isSubmitting"
                  :disabled="!canTranscribe"
                  icon="i-lucide-sparkles"
                  @click="sendForTranscription"
                >
                  Send to transcription route
                </UButton>
              </div>

              <div
                v-if="hasRecording && recordingUrl"
                class="space-y-1 pt-1"
              >
                <p class="text-sm text-muted">
                  Preview recording
                </p>
                <audio
                  :src="recordingUrl"
                  controls
                  class="w-full"
                />
              </div>

              <template #fallback>
                <p class="text-sm text-muted">
                  Audio capture controls are only available in the browser.
                </p>
              </template>
            </ClientOnly>

            <div class="space-y-2">
              <p class="text-sm font-medium text-highlighted">
                Transcript (dummy response)
              </p>
              <UTextarea
                :model-value="transcript || 'Transcript will appear here after calling /api/transcribe.'"
                color="neutral"
                variant="subtle"
                readonly
                :rows="6"
                class="w-full"
              />
            </div>

            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              title="Something went wrong"
              :description="error"
            />

            <UAlert
              v-else-if="!isSupported"
              color="warning"
              variant="subtle"
              title="Audio capture not available"
              description="Your browser does not support microphone access. Try using a modern browser like Chrome, Edge, or Safari."
            />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>


