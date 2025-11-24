<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useObjectUrl } from '@vueuse/core'

const isSupported = ref(true)
const isRecording = ref(false)
const isSubmitting = ref(false)
const isExtracting = ref(false)
const hasRecording = ref(false)
const extractionViewMode = ref<'pretty' | 'raw'>('pretty')
const transcript = ref('')
const error = ref<string | null>(null)
const extractionError = ref<string | null>(null)
const extractionResult = ref<any | null>(null)

// Supabase auth/session used to authorize server-side extraction APIs
const supabase = useSupabaseClient()
const supabaseSession = useSupabaseSession()

// Tab state: audio vs communications evidence
const activeCaptureTab = ref<'audio' | 'communications'>('audio')

// Communications evidence (file -> image data URL -> structured evidence)
const communicationImageUrl = ref('') // data URL or external URL for the selected image
const communicationImageName = ref('')
const communicationImageMimeType = ref('')
const hasCommunicationImage = computed(() => communicationImageUrl.value.trim().length > 0)
const isCommExtracting = ref(false)
const commExtractionError = ref<string | null>(null)
const commExtractionResult = ref<any | null>(null)
const commExtractionViewMode = ref<'pretty' | 'raw'>('pretty')

const captureText = ref('')
const hasCaptureText = computed(() => captureText.value.trim().length > 0)

// Calendar date when the events in this note occurred.
// Defaults to today's date (local), formatted as YYYY-MM-DD for the native date input.
const eventDate = ref<string>(new Date().toISOString().slice(0, 10))

const recordingBlob = ref<Blob | null>(null)
const recordingUrl = useObjectUrl(recordingBlob)

let mediaRecorder: MediaRecorder | null = null
let chunks: BlobPart[] = []
let recordingMimeType = '' // Track the actual mime type used by MediaRecorder

const canTranscribe = computed(() => hasRecording.value && !isRecording.value && !isSubmitting.value)
const hasTranscript = computed(() => transcript.value.trim().length > 0)

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
  extractionError.value = null

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunks = []

    // Pick a MIME type that this browser actually supports
    let preferredMimeType = ''
    if (typeof MediaRecorder !== 'undefined') {
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav'
      ]

      for (const candidate of candidates) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          preferredMimeType = candidate
          break
        }
      }
    }

    mediaRecorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream)

    recordingMimeType = mediaRecorder.mimeType || preferredMimeType || 'audio/webm'

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: recordingMimeType })
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

async function loadTestAudio(audioFile: string = 'invictus') {
  error.value = null
  extractionError.value = null
  isRecording.value = false
  
  try {
    // Map audio file names to their paths
    const audioFiles: Record<string, string> = {
      'invictus': '/invictus.mp3',
      'speech': '/test-speech.wav',
      'music': '/test-audio.mp3'
    }
    
    const filename = audioFiles[audioFile] || '/invictus.mp3'
    const response = await fetch(filename)
    if (!response.ok) {
      throw new Error(`Failed to load ${audioFile} audio`)
    }
    
    const blob = await response.blob()
    recordingBlob.value = blob
    hasRecording.value = true
    transcript.value = ''
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    error.value = `Failed to load ${audioFile} audio file.`
  }
}

function loadTestText(sample: string = 'incident') {
  error.value = null
  isRecording.value = false
  hasRecording.value = false

  const samples: Record<string, string> = {
    incident: `Tonight the kids were scheduled to be dropped off at 6:00 PM per our custody agreement. Other parent arrived at 6:45 PM with no prior notice or communication about being late. When they arrived, I could smell alcohol on their breath and they seemed unsteady. The children mentioned they hadn't eaten dinner yet and were asking for food. Sarah (8) said "Daddy forgot to feed us again" and looked upset. Tommy (5) was crying and said his tummy hurt from being hungry. 

I offered to feed them before the exchange but other parent became hostile and said I was "trying to make them look bad." They raised their voice in front of the children, causing Tommy to cry harder. I remained calm and documented the time with my phone. The exchange finally happened at 6:52 PM. I immediately fed the children when we got home - they each ate two full plates of food. 

This is the third late exchange this month without notice. Previous incidents were on November 3rd (30 minutes late) and November 11th (1 hour late). I'm concerned about the pattern and the children's wellbeing during the other parent's custody time.`,
    
    positive: `Had a wonderful day with the kids today. Started with making pancakes together for breakfast - Sarah helped mix the batter while Tommy set the table. We practiced counting with the chocolate chips and Sarah read the recipe instructions out loud, which was great for her reading practice.

Took both kids to their pediatrician appointment at 10:00 AM. Dr. Martinez confirmed both children are healthy and developing well. Sarah is in the 75th percentile for height and weight, Tommy is in the 60th percentile. Both are up to date on all vaccinations. Doctor noted Sarah's reading level is advanced for her age and Tommy's speech development is progressing excellently. No concerns noted. I recorded the visit summary and sent it to other parent via Our Family Wizard at 11:30 AM.

After the appointment, we went to the library for story time. Sarah checked out three chapter books and Tommy got a picture book about dinosaurs. The librarian commented on how well-behaved and engaged both children were during the reading session.

In the afternoon, we did homework together. Sarah completed her math worksheet independently and I helped Tommy practice writing his name. We ended the day with a family bike ride around the neighborhood - both kids wore their helmets without being asked. Tommy rode his bike without training wheels for the first time for about 50 feet! Sarah cheered him on. Bedtime routine went smoothly, both kids were in bed by 8:00 PM after baths, teeth brushing, and bedtime stories.`,
    
    neutral: `Today's custody exchange at 5:00 PM at the designated meeting spot (Walmart parking lot on Main Street). I arrived at 4:55 PM and parked in our usual spot near the garden center. Other parent arrived at 5:02 PM. 

The children had their overnight bags packed with: 
- 2 changes of clothes each
- Toiletries (toothbrushes, toothpaste)
- Sarah's retainer and case
- Tommy's special blanket
- Both kids' homework folders
- Sarah's science project (due Monday)
- Medications: Tommy's allergy medicine (Zyrtec, 5mg, one tablet daily in morning)

Brief conversation with other parent about upcoming school events:
- Parent-teacher conferences next Thursday at 3:00 PM (Sarah) and 3:30 PM (Tommy)
- Sarah's soccer game Saturday at 10:00 AM at River Park field #3
- Tommy's preschool Halloween party on October 31st at 2:00 PM

Other parent confirmed receipt of all items and awareness of schedule. Children transitioned calmly, gave me hugs goodbye, and walked to other parent's vehicle without incident. Both children appeared in good spirits. No concerns noted. Exchange completed at 5:08 PM.`
  }

  const text: string = (samples[sample] as string) ?? samples.incident
  captureText.value = text
  transcript.value = text
}

async function sendForTranscription() {
  if (!recordingBlob.value || !canTranscribe.value) {
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    const formData = new FormData()
    // Determine file extension based on MIME type
    const mimeType = recordingBlob.value.type || recordingMimeType || 'audio/webm'
    let fileExtension = 'webm'

    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      fileExtension = 'mp3'
    } else if (mimeType.includes('wav')) {
      fileExtension = 'wav'
    } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
      fileExtension = 'mp4'
    }

    formData.append('audio', recordingBlob.value, `recording.${fileExtension}`)

    const response = await $fetch<{ transcript: string }>('/api/transcribe', {
      method: 'POST',
      body: formData as any
    })

    transcript.value = response.transcript
    extractionResult.value = null
    extractionError.value = null
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    error.value = 'Failed to contact transcription service. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

async function extractFromTranscript() {
  if (!hasTranscript.value || isExtracting.value) {
    return
  }

  isExtracting.value = true
  extractionError.value = null

  try {
    extractionViewMode.value = 'pretty'

    // Ensure the Supabase access token is sent so serverSupabaseUser can authenticate the request
    const accessToken =
      supabaseSession.value?.access_token || (await supabase.auth.getSession()).data.session?.access_token

    const result = await $fetch<any>('/api/voice-extraction', {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: {
        transcript: transcript.value,
        referenceDate: eventDate.value || undefined
      }
    })

    extractionResult.value = result
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e)
    extractionError.value = e?.data?.statusMessage || 'Failed to run extraction. Please try again.'
  } finally {
    isExtracting.value = false
  }
}

function eventColor(type: string): 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  switch (type) {
    case 'incident':
      return 'error'
    case 'positive':
      return 'success'
    case 'medical':
      return 'info'
    case 'school':
      return 'warning'
    case 'communication':
      return 'primary'
    case 'legal':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function actionPriorityColor(priority: string): 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  switch (priority) {
    case 'urgent':
      return 'error'
    case 'high':
      return 'warning'
    case 'normal':
      return 'info'
    case 'low':
      return 'neutral'
    default:
      return 'neutral'
  }
}

const extractionUsage = computed(() => {
  if (!extractionResult.value) {
    return null
  }

  return extractionResult.value._usage || extractionResult.value.usage || null
})

const extractionCost = computed(() => {
  if (!extractionResult.value) {
    return null
  }

  return extractionResult.value._cost || extractionResult.value.cost || null
})

const commExtractionUsage = computed(() => {
  if (!commExtractionResult.value) {
    return null
  }

  return commExtractionResult.value._usage || commExtractionResult.value.usage || null
})

const commExtractionCost = computed(() => {
  if (!commExtractionResult.value) {
    return null
  }

  return commExtractionResult.value._cost || commExtractionResult.value.cost || null
})

function onCommunicationFileChange(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]

  commExtractionError.value = null
  commExtractionResult.value = null

  if (!file) {
    communicationImageName.value = ''
    communicationImageUrl.value = ''
    communicationImageMimeType.value = ''
    return
  }

  communicationImageName.value = file.name
  communicationImageMimeType.value = file.type || ''

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      // Use a data URL so we don't need to store the image anywhere; OpenAI
      // can consume data URLs via image_url.
      communicationImageUrl.value = reader.result
    }
  }
  reader.readAsDataURL(file)
}

async function extractFromCommunicationImage() {
  if (!hasCommunicationImage.value || isCommExtracting.value) {
    return
  }

  isCommExtracting.value = true
  commExtractionError.value = null
  commExtractionResult.value = null

  try {
    commExtractionViewMode.value = 'pretty'

    // Ensure the Supabase access token is sent so serverSupabaseUser can authenticate the request
    const accessToken =
      supabaseSession.value?.access_token || (await supabase.auth.getSession()).data.session?.access_token

    const result = await $fetch<any>('/api/evidence-communication-extract', {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: {
        imageUrl: communicationImageUrl.value.trim(),
        originalFilename: communicationImageName.value || undefined,
        mimeType: communicationImageMimeType.value || undefined
      }
    })

    commExtractionResult.value = result
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e)
    commExtractionError.value = e?.data?.statusMessage || 'Failed to run communication extraction. Please check the image URL and try again.'
  } finally {
    isCommExtracting.value = false
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
        <UTabs
          v-model="activeCaptureTab"
          :items="[
            {
              label: 'Voice \u2192 Events',
              value: 'audio',
              icon: 'i-lucide-mic'
            },
            {
              label: 'Image \u2192 Communications Evidence',
              value: 'communications',
              icon: 'i-lucide-image'
            }
          ]"
          color="primary"
        />

        <UCard v-if="activeCaptureTab === 'audio'">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="font-medium text-highlighted">
                  Audio Capture & Transcription
                </p>
                <p class="text-sm text-muted">
                  Record audio and transcribe it using OpenAI's Whisper model.
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
                  Transcribe with AI
                </UButton>
                
                <UDropdownMenu 
                  :items="[
                    [
                      {
                        label: 'Invictus Poem (audio)',
                        icon: 'i-lucide-book-open',
                        onSelect: () => loadTestAudio('invictus')
                      },
                      {
                        label: 'Speech Sample (audio)',
                        icon: 'i-lucide-mic-2',
                        onSelect: () => loadTestAudio('speech')
                      },
                      {
                        label: 'Music Sample (audio)',
                        icon: 'i-lucide-music',
                        onSelect: () => loadTestAudio('music')
                      }
                    ],
                    [
                      {
                        label: 'Late exchange incident (text)',
                        icon: 'i-lucide-file-text',
                        onSelect: () => loadTestText('incident')
                      },
                      {
                        label: 'Positive parenting day (text)',
                        icon: 'i-lucide-file-pen',
                        onSelect: () => loadTestText('positive')
                      },
                      {
                        label: 'Routine neutral exchange (text)',
                        icon: 'i-lucide-file',
                        onSelect: () => loadTestText('neutral')
                      }
                    ]
                  ]"
                  :disabled="isRecording || isSubmitting"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-download"
                    trailing-icon="i-lucide-chevron-down"
                    :disabled="isRecording || isSubmitting"
                  >
                    Load test audio
                  </UButton>
                </UDropdownMenu>
              </div>

              <div class="space-y-2 w-full">
                <p class="text-sm font-medium text-highlighted">
                  Manual text capture
                </p>
                <p class="text-xs text-muted">
                  Type or paste a note when you can&apos;t record audio. Use the dropdown above to load sample text captures.
                </p>
                <UTextarea
                  v-model="captureText"
                  color="neutral"
                  variant="outline"
                  :rows="4"
                  class="w-full"
                  placeholder="Example note about an incident or positive parenting moment..."
                />
                <div class="flex justify-end">
                  <UButton
                    color="primary"
                    variant="ghost"
                    size="xs"
                    :disabled="!hasCaptureText"
                    @click="transcript = captureText"
                  >
                    Use text as transcript
                  </UButton>
                </div>
              </div>

              <div class="space-y-2 w-full">
                <p class="text-sm font-medium text-highlighted">
                  Date of this note
                </p>
                <p class="text-xs text-muted">
                  Choose the calendar date when these events happened. It defaults to today so you can quickly log
                  something that just occurred, but you can change it to document earlier incidents.
                </p>
                <UInput
                  v-model="eventDate"
                  type="date"
                  color="neutral"
                  variant="outline"
                />
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
                Transcript
              </p>
              <UTextarea
                :model-value="transcript || 'Transcript will appear here after transcription.'"
                color="neutral"
                variant="subtle"
                readonly
                :rows="6"
                class="w-full"
              />
            </div>

            <div class="flex justify-end">
              <UButton
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-sparkles"
                :loading="isExtracting"
                :disabled="!hasTranscript || isExtracting"
                @click="extractFromTranscript"
              >
                Extract structured events
              </UButton>
            </div>

            <div
              v-if="extractionResult"
              class="space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-highlighted">
                  Extraction result
                </p>
                <div class="inline-flex rounded-lg border border-default overflow-hidden">
                  <UButton
                    color="neutral"
                    size="xs"
                    :variant="extractionViewMode === 'pretty' ? 'solid' : 'ghost'"
                    class="rounded-none"
                    @click="extractionViewMode = 'pretty'"
                  >
                    Pretty
                  </UButton>
                  <UButton
                    color="neutral"
                    size="xs"
                    :variant="extractionViewMode === 'raw' ? 'solid' : 'ghost'"
                    class="rounded-none border-l border-default"
                    @click="extractionViewMode = 'raw'"
                  >
                    Raw JSON
                  </UButton>
                </div>
              </div>

              <div
                v-if="extractionUsage || extractionCost"
                class="flex flex-wrap items-center gap-2 text-[11px] text-muted"
              >
                <span v-if="extractionUsage">
                  Tokens:
                  <span class="font-medium text-highlighted">
                    {{ extractionUsage.total_tokens ?? (extractionUsage.prompt_tokens ?? 0) + (extractionUsage.completion_tokens ?? 0) }}
                  </span>
                  <span v-if="extractionUsage.prompt_tokens !== undefined">
                    (prompt {{ extractionUsage.prompt_tokens }}, completion {{ extractionUsage.completion_tokens ?? 0 }})
                  </span>
                </span>
                <span v-if="extractionCost?.total_usd !== null && extractionCost?.total_usd !== undefined">
                  • Est. cost:
                  <span class="font-medium text-highlighted">
                    ${{ extractionCost.total_usd.toFixed(6) }}
                  </span>
                </span>
              </div>

              <div v-if="extractionViewMode === 'pretty'" class="space-y-4">
                <div v-if="extractionResult?.extraction?.events?.length" class="space-y-2">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Events
                  </p>
                  <div
                    v-for="(eventItem, index) in extractionResult.extraction.events"
                    :key="index"
                    class="border border-default rounded-lg p-3 space-y-2 bg-subtle"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-sm font-medium text-highlighted">
                            {{ eventItem.title || 'Untitled event' }}
                          </p>
                          <UBadge
                            v-if="eventItem.type"
                            :color="eventColor(eventItem.type)"
                            variant="subtle"
                            size="xs"
                            class="uppercase tracking-wide"
                          >
                            {{ eventItem.type }}
                          </UBadge>
                        </div>
                        <p
                          v-if="eventItem.description"
                          class="text-xs text-muted mt-1"
                        >
                          {{ eventItem.description }}
                        </p>
                      </div>
                      <div class="text-right space-y-1">
                        <p
                          v-if="eventItem.primary_timestamp"
                          class="text-xs text-muted"
                        >
                          {{ eventItem.primary_timestamp }}
                        </p>
                        <p
                          v-if="eventItem.timestamp_precision"
                          class="text-[10px] text-muted uppercase tracking-wide"
                        >
                          {{ eventItem.timestamp_precision }}
                        </p>
                        <p
                          v-if="eventItem.child_involved"
                          class="text-[10px] text-success font-medium"
                        >
                          Child involved
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-3 text-[11px] text-muted">
                      <div v-if="eventItem.participants?.primary?.length">
                        <span class="font-medium text-highlighted">Primary:</span>
                        {{ eventItem.participants.primary.join(', ') }}
                      </div>
                      <div v-if="eventItem.participants?.witnesses?.length">
                        <span class="font-medium text-highlighted">Witnesses:</span>
                        {{ eventItem.participants.witnesses.join(', ') }}
                      </div>
                      <div v-if="eventItem.participants?.professionals?.length">
                        <span class="font-medium text-highlighted">Professionals:</span>
                        {{ eventItem.participants.professionals.join(', ') }}
                      </div>
                    </div>

                    <div
                      v-if="eventItem.patterns_noted?.length"
                      class="flex flex-wrap gap-1"
                    >
                      <UBadge
                        v-for="pattern in eventItem.patterns_noted"
                        :key="pattern"
                        color="info"
                        variant="soft"
                        size="xs"
                      >
                        {{ pattern }}
                      </UBadge>
                    </div>

                    <div
                      v-if="eventItem.custody_relevance"
                      class="flex flex-wrap gap-3 text-[11px] text-muted"
                    >
                      <div v-if="eventItem.custody_relevance.agreement_violation !== undefined && eventItem.custody_relevance.agreement_violation !== null">
                        <span class="font-medium text-highlighted">Agreement violation:</span>
                        {{ eventItem.custody_relevance.agreement_violation ? 'Yes' : 'No' }}
                      </div>
                      <div v-if="eventItem.custody_relevance.safety_concern !== undefined && eventItem.custody_relevance.safety_concern !== null">
                        <span class="font-medium text-highlighted">Safety concern:</span>
                        {{ eventItem.custody_relevance.safety_concern ? 'Yes' : 'No' }}
                      </div>
                      <div v-if="eventItem.custody_relevance.welfare_impact">
                        <span class="font-medium text-highlighted">Welfare impact:</span>
                        {{ eventItem.custody_relevance.welfare_impact }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="extractionResult?.extraction?.action_items?.length" class="space-y-2">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Action items
                  </p>
                  <div
                    v-for="(action, index) in extractionResult.extraction.action_items"
                    :key="index"
                    class="border border-default rounded-lg p-3 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p class="text-xs text-highlighted font-medium">
                        {{ action.description || 'Action item' }}
                      </p>
                      <p
                        v-if="action.deadline"
                        class="text-[11px] text-muted mt-0.5"
                      >
                        Deadline: {{ action.deadline }}
                      </p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <UBadge
                        v-if="action.priority"
                        :color="actionPriorityColor(action.priority)"
                        variant="subtle"
                        size="xs"
                      >
                        {{ action.priority }}
                      </UBadge>
                      <UBadge
                        v-if="action.type"
                        color="neutral"
                        variant="soft"
                        size="xs"
                      >
                        {{ action.type }}
                      </UBadge>
                    </div>
                  </div>
                </div>

                <div v-if="extractionResult?.extraction?.metadata" class="space-y-1">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Metadata
                  </p>
                  <div class="grid grid-cols-1 gap-1 text-[11px] text-muted">
                    <p v-if="extractionResult.extraction.metadata.recording_timestamp">
                      <span class="font-medium text-highlighted">Recording time:</span>
                      {{ extractionResult.extraction.metadata.recording_timestamp }}
                    </p>
                    <p v-if="extractionResult.extraction.metadata.recording_duration_seconds !== undefined && extractionResult.extraction.metadata.recording_duration_seconds !== null">
                      <span class="font-medium text-highlighted">Recording duration:</span>
                      {{ extractionResult.extraction.metadata.recording_duration_seconds }}s
                    </p>
                    <p v-if="extractionResult.extraction.metadata.transcription_confidence !== undefined && extractionResult.extraction.metadata.transcription_confidence !== null">
                      <span class="font-medium text-highlighted">Transcription confidence:</span>
                      {{ extractionResult.extraction.metadata.transcription_confidence }}
                    </p>
                    <p v-if="extractionResult.extraction.metadata.extraction_confidence !== undefined && extractionResult.extraction.metadata.extraction_confidence !== null">
                      <span class="font-medium text-highlighted">Extraction confidence:</span>
                      {{ extractionResult.extraction.metadata.extraction_confidence }}
                    </p>
                    <p v-if="extractionResult.extraction.metadata.ambiguities?.length">
                      <span class="font-medium text-highlighted">Ambiguities:</span>
                      {{ extractionResult.extraction.metadata.ambiguities.join('; ') }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-else>
                <p class="text-xs text-muted">
                  Raw JSON output from the extraction model.
                </p>
                <UTextarea
                  :model-value="JSON.stringify(extractionResult, null, 2)"
                  color="neutral"
                  variant="subtle"
                  readonly
                  :rows="10"
                  class="font-mono text-xs w-full"
                />
              </div>
            </div>

            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              title="Something went wrong"
              :description="error"
            />

            <UAlert
              v-else-if="extractionError"
              color="error"
              variant="subtle"
              title="Extraction failed"
              :description="extractionError"
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

        <UCard v-else>
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="font-medium text-highlighted">
                  Communications Evidence (Image &rarr; Structured JSON)
                </p>
                <p class="text-sm text-muted">
                  Select a screenshot of texts or email from your device and we&apos;ll extract a structured
                  communications object plus suggested event/evidence payloads. The original image will be stored
                  securely in Supabase Storage and linked to an evidence record, so you can reference it later.
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="space-y-2">
              <p class="text-sm font-medium text-highlighted">
                Image file
              </p>
              <p class="text-xs text-muted">
                Choose a screenshot or photo of a communication (text thread, email, etc.). We&apos;ll read it in the
                browser and send it directly to the AI API without storing it.
              </p>
              <input
                type="file"
                accept="image/*"
                class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                @change="onCommunicationFileChange"
              />
              <p
                v-if="communicationImageName"
                class="text-xs text-muted"
              >
                Selected:
                <span class="font-medium text-highlighted">
                  {{ communicationImageName }}
                </span>
              </p>
            </div>

            <div class="flex justify-end">
              <UButton
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-sparkles"
                :loading="isCommExtracting"
                :disabled="!hasCommunicationImage || isCommExtracting"
                @click="extractFromCommunicationImage"
              >
                Extract communications evidence
              </UButton>
            </div>

            <div
              v-if="commExtractionResult"
              class="space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-highlighted">
                  Extraction result
                </p>
                <div class="inline-flex rounded-lg border border-default overflow-hidden">
                  <UButton
                    color="neutral"
                    size="xs"
                    :variant="commExtractionViewMode === 'pretty' ? 'solid' : 'ghost'"
                    class="rounded-none"
                    @click="commExtractionViewMode = 'pretty'"
                  >
                    Pretty
                  </UButton>
                  <UButton
                    color="neutral"
                    size="xs"
                    :variant="commExtractionViewMode === 'raw' ? 'solid' : 'ghost'"
                    class="rounded-none border-l border-default"
                    @click="commExtractionViewMode = 'raw'"
                  >
                    Raw JSON
                  </UButton>
                </div>
              </div>

              <div
                v-if="commExtractionUsage || commExtractionCost"
                class="flex flex-wrap items-center gap-2 text-[11px] text-muted"
              >
                <span v-if="commExtractionUsage">
                  Tokens:
                  <span class="font-medium text-highlighted">
                    {{ commExtractionUsage.total_tokens ?? (commExtractionUsage.input_tokens ?? 0) + (commExtractionUsage.output_tokens ?? 0) }}
                  </span>
                </span>
                <span v-if="commExtractionCost?.total_usd !== null && commExtractionCost?.total_usd !== undefined">
                  • Est. cost:
                  <span class="font-medium text-highlighted">
                    ${{ commExtractionCost.total_usd.toFixed(6) }}
                  </span>
                </span>
              </div>

              <div v-if="commExtractionViewMode === 'pretty'" class="space-y-4">
                <div v-if="commExtractionResult?.extraction?.communications?.length" class="space-y-2">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Communications
                  </p>
                  <div
                    v-for="(comm, index) in commExtractionResult.extraction.communications"
                    :key="index"
                    class="border border-default rounded-lg p-3 space-y-2 bg-subtle"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-sm font-medium text-highlighted">
                            {{ comm.summary || 'Communication' }}
                          </p>
                          <UBadge
                            v-if="comm.medium"
                            color="info"
                            variant="subtle"
                            size="xs"
                            class="uppercase tracking-wide"
                          >
                            {{ comm.medium }}
                          </UBadge>
                          <UBadge
                            v-if="comm.direction"
                            color="neutral"
                            variant="soft"
                            size="xs"
                            class="uppercase tracking-wide"
                          >
                            {{ comm.direction }}
                          </UBadge>
                        </div>
                        <p
                          v-if="comm.body_text"
                          class="text-xs text-muted mt-1 line-clamp-3"
                        >
                          {{ comm.body_text }}
                        </p>
                      </div>
                      <div class="text-right space-y-1">
                        <p
                          v-if="comm.sent_at"
                          class="text-xs text-muted"
                        >
                          {{ comm.sent_at }}
                        </p>
                        <p
                          v-if="comm.timestamp_precision"
                          class="text-[10px] text-muted uppercase tracking-wide"
                        >
                          {{ comm.timestamp_precision }}
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-3 text-[11px] text-muted">
                      <div v-if="comm.participants?.from">
                        <span class="font-medium text-highlighted">From:</span>
                        {{ comm.participants.from }}
                      </div>
                      <div v-if="comm.participants?.to?.length">
                        <span class="font-medium text-highlighted">To:</span>
                        {{ comm.participants.to.join(', ') }}
                      </div>
                      <div v-if="comm.participants?.others?.length">
                        <span class="font-medium text-highlighted">Others:</span>
                        {{ comm.participants.others.join(', ') }}
                      </div>
                    </div>

                    <div
                      v-if="comm.welfare_impact"
                      class="text-[11px] text-muted"
                    >
                      <span class="font-medium text-highlighted">Welfare impact:</span>
                      {{ comm.welfare_impact }}
                    </div>

                    <div class="flex justify-end">
                      <UModal>
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-info"
                        >
                          View details
                        </UButton>

                        <template #content>
                          <UCard>
                            <template #header>
                              <div class="flex items-center justify-between gap-2">
                                <p class="font-medium text-highlighted">
                                  Communication details
                                </p>
                                <UBadge
                                  v-if="comm.medium"
                                  color="info"
                                  variant="subtle"
                                  size="xs"
                                  class="uppercase tracking-wide"
                                >
                                  {{ comm.medium }}
                                </UBadge>
                              </div>
                            </template>

                            <div class="space-y-3">
                              <div v-if="comm.body_text">
                                <p class="text-xs font-medium text-highlighted">
                                  Body text
                                </p>
                                <p class="text-xs text-muted whitespace-pre-wrap">
                                  {{ comm.body_text }}
                                </p>
                              </div>

                              <div v-if="comm.participants" class="space-y-1 text-[11px] text-muted">
                                <p class="text-xs font-medium text-highlighted">
                                  Participants
                                </p>
                                <p v-if="comm.participants.from">
                                  <span class="font-medium text-highlighted">From:</span>
                                  {{ comm.participants.from }}
                                </p>
                                <p v-if="comm.participants.to?.length">
                                  <span class="font-medium text-highlighted">To:</span>
                                  {{ comm.participants.to.join(', ') }}
                                </p>
                                <p v-if="comm.participants.others?.length">
                                  <span class="font-medium text-highlighted">Others:</span>
                                  {{ comm.participants.others.join(', ') }}
                                </p>
                              </div>

                              <div class="grid grid-cols-1 gap-1 text-[11px] text-muted">
                                <p v-if="comm.child_involved !== undefined && comm.child_involved !== null">
                                  <span class="font-medium text-highlighted">Child involved:</span>
                                  {{ comm.child_involved ? 'Yes' : 'No' }}
                                </p>
                                <p v-if="comm.agreement_violation !== undefined && comm.agreement_violation !== null">
                                  <span class="font-medium text-highlighted">Agreement violation:</span>
                                  {{ comm.agreement_violation ? 'Yes' : 'No' }}
                                </p>
                                <p v-if="comm.safety_concern !== undefined && comm.safety_concern !== null">
                                  <span class="font-medium text-highlighted">Safety concern:</span>
                                  {{ comm.safety_concern ? 'Yes' : 'No' }}
                                </p>
                                <p v-if="comm.welfare_impact">
                                  <span class="font-medium text-highlighted">Welfare impact:</span>
                                  {{ comm.welfare_impact }}
                                </p>
                              </div>

                              <div>
                                <p class="text-xs font-medium text-highlighted mb-1">
                                  Full JSON
                                </p>
                                <UTextarea
                                  :model-value="JSON.stringify(comm, null, 2)"
                                  color="neutral"
                                  variant="subtle"
                                  readonly
                                  :rows="10"
                                  class="font-mono text-[11px] w-full"
                                />
                              </div>
                            </div>
                          </UCard>
                        </template>
                      </UModal>
                    </div>
                  </div>
                </div>

                <div v-if="commExtractionResult?.extraction?.db_suggestions?.events?.length" class="space-y-2">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Suggested event (for events table)
                  </p>
                  <div
                    v-for="(eventItem, index) in commExtractionResult.extraction.db_suggestions.events"
                    :key="index"
                    class="border border-dashed border-default rounded-lg p-3 space-y-2"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-sm font-medium text-highlighted">
                            {{ eventItem.title || 'Suggested communication event' }}
                          </p>
                          <UBadge
                            v-if="eventItem.type"
                            :color="eventColor(eventItem.type)"
                            variant="subtle"
                            size="xs"
                            class="uppercase tracking-wide"
                          >
                            {{ eventItem.type }}
                          </UBadge>
                        </div>
                        <p
                          v-if="eventItem.description"
                          class="text-xs text-muted mt-1"
                        >
                          {{ eventItem.description }}
                        </p>
                      </div>
                      <div class="text-right space-y-1">
                        <p
                          v-if="eventItem.primary_timestamp"
                          class="text-xs text-muted"
                        >
                          {{ eventItem.primary_timestamp }}
                        </p>
                        <p
                          v-if="eventItem.timestamp_precision"
                          class="text-[10px] text-muted uppercase tracking-wide"
                        >
                          {{ eventItem.timestamp_precision }}
                        </p>
                      </div>
                    </div>

                    <div class="flex justify-end">
                      <UModal>
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-info"
                        >
                          View event JSON
                        </UButton>

                        <template #content>
                          <UCard>
                            <template #header>
                              <p class="font-medium text-highlighted">
                                Suggested event JSON
                              </p>
                            </template>

                            <UTextarea
                              :model-value="JSON.stringify(eventItem, null, 2)"
                              color="neutral"
                              variant="subtle"
                              readonly
                              :rows="14"
                              class="font-mono text-[11px] w-full"
                            />
                          </UCard>
                        </template>
                      </UModal>
                    </div>
                  </div>
                </div>

                <div v-if="commExtractionResult?.extraction?.db_suggestions?.evidence?.length" class="space-y-2">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Suggested evidence (for evidence table)
                  </p>
                  <div
                    v-for="(ev, index) in commExtractionResult.extraction.db_suggestions.evidence"
                    :key="index"
                    class="border border-dashed border-default rounded-lg p-3 space-y-2"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-sm font-medium text-highlighted">
                            {{ ev.summary || 'Suggested evidence summary' }}
                          </p>
                          <UBadge
                            v-if="ev.source_type"
                            color="primary"
                            variant="subtle"
                            size="xs"
                            class="uppercase tracking-wide"
                          >
                            {{ ev.source_type }}
                          </UBadge>
                        </div>
                        <p
                          v-if="ev.tags?.length"
                          class="text-[11px] text-muted mt-1"
                        >
                          <span class="font-medium text-highlighted">Tags:</span>
                          {{ ev.tags.join(', ') }}
                        </p>
                      </div>
                    </div>

                    <div class="flex justify-end">
                      <UModal>
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-lucide-info"
                        >
                          View evidence JSON
                        </UButton>

                        <template #content>
                          <UCard>
                            <template #header>
                              <p class="font-medium text-highlighted">
                                Suggested evidence JSON
                              </p>
                            </template>

                            <UTextarea
                              :model-value="JSON.stringify(ev, null, 2)"
                              color="neutral"
                              variant="subtle"
                              readonly
                              :rows="14"
                              class="font-mono text-[11px] w-full"
                            />
                          </UCard>
                        </template>
                      </UModal>
                    </div>
                  </div>
                </div>

                <div v-if="commExtractionResult?.extraction?.metadata" class="space-y-1">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide">
                    Metadata
                  </p>
                  <div class="grid grid-cols-1 gap-1 text-[11px] text-muted">
                    <p v-if="commExtractionResult.extraction.metadata.image_analysis_confidence !== undefined && commExtractionResult.extraction.metadata.image_analysis_confidence !== null">
                      <span class="font-medium text-highlighted">Image analysis confidence:</span>
                      {{ commExtractionResult.extraction.metadata.image_analysis_confidence }}
                    </p>
                    <p v-if="commExtractionResult.extraction.metadata.ambiguities?.length">
                      <span class="font-medium text-highlighted">Ambiguities:</span>
                      {{ commExtractionResult.extraction.metadata.ambiguities.join('; ') }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-else>
                <p class="text-xs text-muted">
                  Raw JSON output from the communications extraction model.
                </p>
                <UTextarea
                  :model-value="JSON.stringify(commExtractionResult, null, 2)"
                  color="neutral"
                  variant="subtle"
                  readonly
                  :rows="10"
                  class="font-mono text-xs w-full"
                />
              </div>
            </div>

            <UAlert
              v-if="commExtractionError"
              color="error"
              variant="subtle"
              title="Extraction failed"
              :description="commExtractionError"
            />

          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>


