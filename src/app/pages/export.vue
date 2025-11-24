<script setup lang="ts">
import type { EvidenceItem, TimelineEvent, EventType } from '~/types'

// Supabase auth (same pattern as evidence/timeline pages)
const supabase = useSupabaseClient()
const session = useSupabaseSession()
const toast = useToast()

// Data from API
const timeline = ref<TimelineEvent[]>([])
const evidence = ref<EvidenceItem[]>([])

const timelineStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const evidenceStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const timelineError = ref<any>(null)
const evidenceError = ref<any>(null)

// Export form state
type ExportFocus = 'full-timeline' | 'incidents-only' | 'positive-parenting'

const exportFocus = ref<ExportFocus>('full-timeline')
const includeEvidenceIndex = ref(true)
const includeOverview = ref(true)

const caseTitle = ref('')
const courtName = ref('')
const recipient = ref('')
const overviewNotes = ref('')

const markdown = ref('')
const generating = ref(false)
const copied = ref(false)
const showRendered = ref(false)
const pdfGenerating = ref(false)

const isLoadingData = computed(
  () => timelineStatus.value === 'pending' || evidenceStatus.value === 'pending'
)

const exportFocusOptions: { label: string; value: ExportFocus; description: string }[] = [{
  label: 'Full timeline',
  value: 'full-timeline',
  description: 'Everything in chronological order – good, bad, and neutral.'
}, {
  label: 'Incidents only',
  value: 'incidents-only',
  description: 'Only focus on documented incidents and concerning events.'
}, {
  label: 'Positive parenting',
  value: 'positive-parenting',
  description: 'Highlight your stability, routines, and positive involvement.'
}]

async function fetchTimeline() {
  timelineStatus.value = 'pending'
  timelineError.value = null

  try {
    const accessToken =
      session.value?.access_token ||
      (await supabase.auth.getSession()).data.session?.access_token

    const result = await $fetch<TimelineEvent[]>('/api/timeline', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    })

    timeline.value = result || []
    timelineStatus.value = 'success'
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[Export] Failed to fetch timeline:', e)
    timelineError.value = e
    timelineStatus.value = 'error'
    timeline.value = []
  }
}

async function fetchEvidence() {
  evidenceStatus.value = 'pending'
  evidenceError.value = null

  try {
    const accessToken =
      session.value?.access_token ||
      (await supabase.auth.getSession()).data.session?.access_token

    const result = await $fetch<EvidenceItem[]>('/api/evidence', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    })

    evidence.value = result || []
    evidenceStatus.value = 'success'
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[Export] Failed to fetch evidence:', e)
    evidenceError.value = e
    evidenceStatus.value = 'error'
    evidence.value = []
  }
}

async function loadData() {
  await Promise.allSettled([
    fetchTimeline(),
    fetchEvidence()
  ])
}

onMounted(() => {
  loadData()
})

watch(session, (newSession) => {
  if (newSession?.access_token) {
    loadData()
  }
})

function formatDate(value?: string) {
  if (!value) return '—'

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatEventType(type: EventType) {
  const map: Record<EventType, string> = {
    positive: 'Positive parenting',
    incident: 'Incident',
    medical: 'Medical',
    school: 'School',
    communication: 'Communication',
    legal: 'Legal / court'
  }

  return map[type] || type
}

const filteredEvents = computed(() => {
  let events = timeline.value || []

  if (exportFocus.value === 'incidents-only') {
    events = events.filter(event => event.type === 'incident')
  } else if (exportFocus.value === 'positive-parenting') {
    events = events.filter(event => event.type === 'positive')
  }

  return events
})

function buildMarkdown() {
  const lines: string[] = []

  lines.push('# Custody case timeline & evidence summary', '')

  if (caseTitle.value.trim()) {
    lines.push(`**Case:** ${caseTitle.value.trim()}`)
  }

  if (courtName.value.trim()) {
    lines.push(`**Court:** ${courtName.value.trim()}`)
  }

  if (recipient.value.trim()) {
    lines.push(`**Prepared for:** ${recipient.value.trim()}`)
  }

  lines.push(`**Generated on:** ${new Date().toLocaleString()}`, '')

  if (includeOverview.value) {
    lines.push('## 1. Overview', '')

    if (overviewNotes.value.trim()) {
      lines.push(overviewNotes.value.trim(), '')
    } else {
      lines.push(
        '_Use this section to briefly explain the current status of your case, upcoming court dates, and what you want the court or your attorney to understand._',
        ''
      )
    }
  }

  lines.push('## 2. Timeline of key events', '')

  const events = filteredEvents.value

  if (!events.length) {
    lines.push('_No events found for this export._', '')
  } else {
    events.forEach((event, index) => {
      lines.push(
        `${index + 1}. ${formatDate(event.timestamp)} — **${event.title}** (${formatEventType(event.type)})`
      )

      if (event.description) {
        lines.push(`   - Details: ${event.description}`)
      }

      if (event.location) {
        lines.push(`   - Location: ${event.location}`)
      }

      if (event.participants?.length) {
        lines.push(`   - Participants: ${event.participants.join(', ')}`)
      }

      if (event.evidenceIds?.length) {
        lines.push(`   - Linked evidence IDs: ${event.evidenceIds.join(', ')}`)
      }

      lines.push('')
    })
  }

  if (includeEvidenceIndex.value) {
    lines.push('## 3. Evidence index', '')

    if (!evidence.value.length) {
      lines.push('_No evidence items found for this export._', '')
    } else {
      evidence.value.forEach((item, index) => {
        lines.push(
          `${index + 1}. [${formatDate(item.createdAt)}] **${item.originalName}** (${item.sourceType})`
        )

        if (item.summary) {
          lines.push(`   - Summary: ${item.summary}`)
        }

        if (item.tags?.length) {
          lines.push(`   - Tags: ${item.tags.join(', ')}`)
        }

        lines.push('')
      })
    }
  }

  lines.push(
    '---',
    '',
    '_This export is generated from your Project Daylight timeline and evidence. Share it with your attorney or attach it as a supporting document for court._'
  )

  return lines.join('\n')
}

async function generateMarkdown() {
  generating.value = true
  copied.value = false

  try {
    markdown.value = buildMarkdown()
  } finally {
    generating.value = false
  }
}

async function copyToClipboard() {
  if (!process.client || !markdown.value) return

  try {
    await navigator.clipboard.writeText(markdown.value)
    copied.value = true
    
    toast.add({
      title: 'Report copied',
      description: 'The markdown report has been copied to your clipboard',
      icon: 'i-lucide-clipboard-check',
      color: 'neutral'
    })
    
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Export] Failed to copy markdown:', e)
    
    toast.add({
      title: 'Copy failed',
      description: 'Unable to copy to clipboard',
      icon: 'i-lucide-clipboard-x',
      color: 'error'
    })
  }
}

async function downloadPdf() {
  if (!process.client) return

  // Ensure we have up-to-date markdown
  if (!markdown.value) {
    await generateMarkdown()
    if (!markdown.value) {
      return
    }
  }

  pdfGenerating.value = true

  try {
    const { jsPDF } = await import('jspdf')

    const doc = new jsPDF({
      unit: 'pt',
      format: 'letter'
    })

    const margin = 54 // 0.75 inch
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - margin * 2
    
    let cursorY = margin
    const lineHeight = 14 // for 10pt text
    
    // Helper: Check for page break
    const ensureSpace = (height: number) => {
      if (cursorY + height > pageHeight - margin) {
        doc.addPage()
        cursorY = margin
        return true
      }
      return false
    }

    // --- HEADER ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Custody case timeline & evidence summary', margin, cursorY)
    cursorY += 30

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    
    // Case Meta
    const metaLines = []
    if (caseTitle.value.trim()) metaLines.push({ label: 'Case:', value: caseTitle.value.trim() })
    if (courtName.value.trim()) metaLines.push({ label: 'Court:', value: courtName.value.trim() })
    if (recipient.value.trim()) metaLines.push({ label: 'Prepared for:', value: recipient.value.trim() })
    metaLines.push({ label: 'Generated on:', value: new Date().toLocaleString() })

    metaLines.forEach(meta => {
      doc.setFont('helvetica', 'bold')
      doc.text(meta.label, margin, cursorY)
      const labelWidth = doc.getTextWidth(meta.label)
      
      doc.setFont('helvetica', 'normal')
      doc.text(meta.value, margin + labelWidth + 5, cursorY)
      
      cursorY += 16
    })

    cursorY += 10
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, cursorY, pageWidth - margin, cursorY)
    cursorY += 25

    // --- SECTION 1: OVERVIEW ---
    if (includeOverview.value) {
      ensureSpace(100)
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('1. Overview', margin, cursorY)
      cursorY += 20
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      
      const overviewText = overviewNotes.value.trim() || 'Use this section to briefly explain the current status of your case, upcoming court dates, and what you want the court or your attorney to understand.'
      
      const splitOverview = doc.splitTextToSize(overviewText, contentWidth)
      
      if (ensureSpace(splitOverview.length * 14)) {
        // If page break happened, reprint header? No, just continue text
      }
      
      doc.text(splitOverview, margin, cursorY)
      cursorY += (splitOverview.length * 14) + 25
    }

    // --- SECTION 2: TIMELINE ---
    ensureSpace(50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('2. Timeline of key events', margin, cursorY)
    cursorY += 20

    const events = filteredEvents.value
    
    if (!events.length) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.text('No events found for this export.', margin, cursorY)
      cursorY += 20
    } else {
      events.forEach((event, index) => {
        // Calculate space needed roughly (header + desc + meta + spacing)
        const descLines = event.description ? doc.splitTextToSize(event.description, contentWidth - 15).length : 0
        const metaCount = (event.location ? 1 : 0) + (event.participants?.length ? 1 : 0) + (event.evidenceIds?.length ? 1 : 0)
        const estimatedHeight = 20 + (descLines * 14) + (metaCount * 14) + 10
        
        ensureSpace(estimatedHeight)

        // Event Header: 1. Date - Title (Type)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100) // Gray for date
        
        const dateStr = formatDate(event.timestamp)
        const dateWidth = doc.getTextWidth(dateStr)
        const numberStr = `${index + 1}. `
        
        doc.setTextColor(0, 0, 0)
        doc.text(numberStr, margin, cursorY)
        
        doc.setTextColor(80, 80, 80)
        doc.text(dateStr, margin + 15, cursorY)
        
        // Title (Bold)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')
        const titleX = margin + 15 + dateWidth + 10 // Spacing
        doc.text(event.title, titleX, cursorY)
        
        // Type (Gray, Italic, Right aligned or Next to title?)
        // Let's put it in parens after title
        const titleWidth = doc.getTextWidth(event.title)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100)
        doc.text(`(${formatEventType(event.type)})`, titleX + titleWidth + 5, cursorY)
        
        cursorY += 16

        // Description
        if (event.description) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          const splitDesc = doc.splitTextToSize(event.description, contentWidth - 15)
          doc.text(splitDesc, margin + 15, cursorY)
          cursorY += (splitDesc.length * 14) + 4
        }

        // Metadata (Location, Participants, Evidence)
        doc.setFontSize(9)
        doc.setTextColor(80, 80, 80)
        
        if (event.location) {
          doc.text(`Location: ${event.location}`, margin + 15, cursorY)
          cursorY += 12
        }
        
        if (event.participants?.length) {
          doc.text(`Participants: ${event.participants.join(', ')}`, margin + 15, cursorY)
          cursorY += 12
        }

        if (event.evidenceIds?.length) {
          doc.setTextColor(0, 100, 200) // Link colorish
          doc.text(`Evidence IDs: ${event.evidenceIds.join(', ')}`, margin + 15, cursorY)
          doc.setTextColor(80, 80, 80)
          cursorY += 12
        }

        cursorY += 10 // Spacing between events
      })
    }
    
    cursorY += 15

    // --- SECTION 3: EVIDENCE INDEX ---
    if (includeEvidenceIndex.value) {
      ensureSpace(50)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text('3. Evidence index', margin, cursorY)
      cursorY += 20

      if (!evidence.value.length) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.text('No evidence items found for this export.', margin, cursorY)
      } else {
        evidence.value.forEach((item, index) => {
          // Calc height
          const summaryLines = item.summary ? doc.splitTextToSize(item.summary, contentWidth - 15).length : 0
          const metaHeight = item.tags?.length ? 14 : 0
          const estimatedHeight = 20 + (summaryLines * 14) + metaHeight + 10
          
          ensureSpace(estimatedHeight)

          // Item Header: 1. [Date] Name (Type)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          
          const numberStr = `${index + 1}. `
          doc.text(numberStr, margin, cursorY)
          
          const dateStr = `[${formatDate(item.createdAt)}] `
          doc.setTextColor(80, 80, 80)
          doc.text(dateStr, margin + 15, cursorY)
          const dateWidth = doc.getTextWidth(dateStr)
          
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'bold')
          doc.text(item.originalName, margin + 15 + dateWidth, cursorY)
          const nameWidth = doc.getTextWidth(item.originalName)
          
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(100, 100, 100)
          doc.text(`(${item.sourceType})`, margin + 15 + dateWidth + nameWidth + 5, cursorY)
          
          cursorY += 16

          if (item.summary) {
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 0)
            const splitSummary = doc.splitTextToSize(item.summary, contentWidth - 15)
            doc.text(splitSummary, margin + 15, cursorY)
            cursorY += (splitSummary.length * 14) + 4
          }

          if (item.tags?.length) {
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 80)
            doc.text(`Tags: ${item.tags.join(', ')}`, margin + 15, cursorY)
            cursorY += 12
          }
          
          cursorY += 10
        })
      }
    }
    
    // Footer - page numbering
    const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.internal.pages.length - 1
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Project Daylight - Page ${i} of ${pageCount}`, margin, pageHeight - 20)
    }

    doc.save('project-daylight-report.pdf')

    toast.add({
      title: 'PDF ready',
      description: 'Your report has been downloaded as a PDF.',
      icon: 'i-lucide-file-down',
      color: 'success'
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Export] Failed to generate PDF:', e)

    toast.add({
      title: 'PDF failed',
      description: 'We were unable to generate the PDF. Please try again.',
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    })
  } finally {
    pdfGenerating.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="export">
    <template #header>
      <UDashboardNavbar title="Export center">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <p class="text-sm text-muted">
          Generate a plain‑text, court‑ready markdown summary you can paste into an email, document, or portal.
          This pulls from your existing
          <code class="px-1 rounded bg-subtle text-xs text-muted border border-default">/api/timeline</code>
          and
          <code class="px-1 rounded bg-subtle text-xs text-muted border border-default">/api/evidence</code>
          data.
        </p>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          <!-- Configuration -->
          <UCard>
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  Case details
                </p>

                <div class="space-y-3">
                  <div class="space-y-1">
                    <p class="text-xs font-medium text-highlighted">
                      Case title
                    </p>
                    <UInput
                      v-model="caseTitle"
                      placeholder="Johnson v. Johnson – custody"
                      class="w-full"
                    />
                    <p class="text-[11px] text-muted">
                      Optional. For example: Johnson v. Johnson – custody.
                    </p>
                  </div>

                  <div class="space-y-1">
                    <p class="text-xs font-medium text-highlighted">
                      Court
                    </p>
                    <UInput
                      v-model="courtName"
                      placeholder="Richmond Circuit Court, VA"
                      class="w-full"
                    />
                    <p class="text-[11px] text-muted">
                      Optional. For example: Richmond Circuit Court, VA.
                    </p>
                  </div>

                  <div class="space-y-1">
                    <p class="text-xs font-medium text-highlighted">
                      Prepared for
                    </p>
                    <UInput
                      v-model="recipient"
                      placeholder="Attorney Smith / GAL / Court"
                      class="w-full"
                    />
                    <p class="text-[11px] text-muted">
                      Optional. Attorney, GAL, or court.
                    </p>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  Focus
                </p>

                <div class="space-y-1">
                  <p class="text-xs font-medium text-highlighted">
                    What do you want to highlight?
                  </p>

                  <USelect
                    v-model="exportFocus"
                    :items="exportFocusOptions"
                    value-attribute="value"
                    option-attribute="label"
                    class="w-full"
                    :ui="{
                      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
                    }"
                  />

                  <p class="mt-1 text-xs text-muted">
                    {{
                      exportFocusOptions.find(option => option.value === exportFocus)?.description
                    }}
                  </p>
                </div>
              </div>

              <div class="space-y-3">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  Sections
                </p>

                <div class="space-y-2">
                  <USwitch
                    v-model="includeOverview"
                    label="Include overview section"
                    description="Short narrative at the top explaining what the reader should understand."
                  />

                  <USwitch
                    v-model="includeEvidenceIndex"
                    label="Include evidence index"
                    description="Numbered list of evidence items with summaries and tags."
                  />
                </div>
              </div>

              <div v-if="includeOverview" class="space-y-1">
                <p class="text-xs font-medium text-highlighted">
                  Overview notes (optional)
                </p>
                <UTextarea
                  v-model="overviewNotes"
                  placeholder="Example: This report covers the last 60 days leading up to the temporary custody hearing on..."
                  :rows="4"
                  autoresize
                  class="w-full"
                />
                <p class="text-[11px] text-muted">
                  If you leave this blank, we'll include a prompt you can fill in later.
                </p>
              </div>

              <div class="pt-2 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 text-xs text-muted">
                  <UIcon
                    v-if="isLoadingData"
                    name="i-lucide-loader-2"
                    class="size-4 animate-spin"
                  />
                  <span v-if="isLoadingData">Loading timeline and evidence…</span>
                  <span v-else>Data loaded from your current timeline and evidence.</span>
                </div>

                <UButton
                  color="primary"
                  icon="i-lucide-file-text"
                  :loading="generating"
                  @click="generateMarkdown"
                >
                  Generate markdown
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Preview -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="font-medium text-highlighted">
                    Markdown preview
                  </p>
                  <p class="text-xs text-muted">
                    Copy‑paste into an email, Word/Google doc, or upload as a supporting exhibit.
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="xs"
                    icon="i-lucide-clipboard"
                    :disabled="!markdown"
                    @click="copyToClipboard"
                  >
                    <span v-if="copied">Copied</span>
                    <span v-else>Copy</span>
                  </UButton>

                  <UButton
                    color="primary"
                    variant="solid"
                    size="xs"
                    icon="i-lucide-file-down"
                    :disabled="!markdown"
                    :loading="pdfGenerating"
                    @click="downloadPdf"
                  >
                    PDF
                  </UButton>
                </div>
              </div>
            </template>

            <div v-if="!markdown" class="text-sm text-muted">
              Click
              <span class="font-medium text-highlighted">Generate markdown</span>
              to see a draft export based on your current timeline and evidence.
            </div>

            <div v-else class="space-y-3">
              <USwitch
                v-model="showRendered"
                label="Show rendered preview"
                description="Toggle between raw markdown and formatted preview"
              />

              <!-- Raw markdown view -->
              <div
                v-if="!showRendered"
                class="max-h-[480px] overflow-y-auto rounded-md border border-default bg-subtle p-4"
              >
                <pre class="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-highlighted">{{ markdown }}</pre>
              </div>

              <!-- Rendered markdown view -->
              <div
                v-else
                class="max-h-[480px] overflow-y-auto rounded-md border border-default bg-white dark:bg-gray-900 p-6"
              >
                <MDC
                  :value="markdown"
                  class="prose prose-sm dark:prose-invert max-w-none"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

