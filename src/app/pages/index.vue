<script setup lang="ts">
definePageMeta({
  layout: 'landing'
})

const heroTitle = 'Turn chaos into court‑ready clarity'
const heroDescription = 'When life gets overwhelming, Daylight helps you capture, organize, and document everything—so you’re prepared for whatever comes next.'

const heroLinks = [
  {
    label: 'Start documenting',
    icon: 'i-lucide-arrow-right',
    color: 'primary',
    to: '/capture'
  },
  {
    label: 'View demo',
    color: 'neutral',
    variant: 'ghost' as const,
    to: '/home'
  }
]

const features = [
  {
    icon: 'i-lucide-mic',
    title: 'Voice capture',
    description: 'Record incidents as they happen. AI transcribes and timestamps everything automatically.'
  },
  {
    icon: 'i-lucide-clock',
    title: 'Timeline view',
    description: 'See everything in chronological order. Perfect for legal proceedings and therapy sessions.'
  },
  {
    icon: 'i-lucide-folder-open',
    title: 'Evidence vault',
    description: 'Store screenshots, emails, and documents securely. Everything backed up and organized.'
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'AI summaries',
    description: 'Generate clear, factual summaries of events for attorneys, therapists, or support teams.'
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Legal exports',
    description: 'Export everything as PDFs with proper formatting for court submissions and legal teams.'
  },
  {
    icon: 'i-lucide-shield',
    title: 'Private & secure',
    description: 'Your data is encrypted and never shared. You control who sees what, always.'
  }
] as const

const cta = {
  title: 'Start protecting yourself today',
  description: 'Free to try. No credit card required.',
  links: [
    {
      label: 'Get started free',
      icon: 'i-lucide-arrow-right',
      color: 'primary',
      to: '/auth/signup'
    }
  ]
} as const

useSeoMeta({
  title: 'Daylight – Turn chaos into court‑ready clarity',
  description: 'Project Daylight is an AI-powered evidence and timeline platform that transforms exhausted scribbles into court‑ready documentation for custody and family court.',
  ogTitle: 'Daylight – Turn chaos into court‑ready clarity',
  ogDescription: 'Transform exhausted scribbles into court‑ready evidence.'
})
</script>

<template>
  <div>
    <UPageHero
      :title="heroTitle"
      :description="heroDescription"
      :links="heroLinks"
      align="center"
    >
      <template #top>
        <UBadge color="primary" variant="soft">
          Court‑first journaling for chaotic seasons
        </UBadge>
      </template>

      <template #links>
        <div class="flex flex-col items-center gap-3 sm:flex-row">
          <UButton
            v-for="(link, index) in heroLinks"
            :key="index"
            v-bind="link"
            size="lg"
          />
        </div>
      </template>

      <template #default>
        <div class="flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
          <span class="flex items-center gap-2">
            <UIcon name="i-lucide-shield-check" class="size-4 text-primary" />
            End-to-end encrypted
          </span>
          <span class="flex items-center gap-2">
            <UIcon name="i-lucide-lock" class="size-4 text-primary" />
            HIPAA aligned
          </span>
          <span class="flex items-center gap-2">
            <UIcon name="i-lucide-scale" class="size-4 text-primary" />
            Built for court
          </span>
        </div>
      </template>
    </UPageHero>

    <UPageSection
      title="Everything you need to protect yourself"
      description="Simple tools that work when you need them most."
    >
      <UPageGrid>
        <UPageCard
          v-for="feature in features"
          :key="feature.title"
          v-bind="feature"
          spotlight
          highlight
          variant="subtle"
        />
      </UPageGrid>
    </UPageSection>

    <USeparator />

    <UPageCTA
      v-bind="cta"
      align="center"
      variant="soft"
    />
  </div>
</template>
