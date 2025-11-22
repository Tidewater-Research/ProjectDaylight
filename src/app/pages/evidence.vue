<script setup lang="ts">
import type { EvidenceItem } from '~/types'

const { data, status } = await useFetch<EvidenceItem[]>('/api/evidence', {
  default: () => [],
  lazy: true
})

const q = ref('')
const sourceFilter = ref<'all' | EvidenceItem['sourceType']>('all')

const sourceOptions: { label: string; value: 'all' | EvidenceItem['sourceType'] }[] = [{
  label: 'All sources',
  value: 'all'
}, {
  label: 'Photos',
  value: 'photo'
}, {
  label: 'Texts',
  value: 'text'
}, {
  label: 'Emails',
  value: 'email'
}, {
  label: 'Documents',
  value: 'document'
}]

const filteredEvidence = computed(() => {
  const items = data.value || []

  return items.filter((item) => {
    const matchesSource = sourceFilter.value === 'all' || item.sourceType === sourceFilter.value
    const query = q.value.trim().toLowerCase()

    if (!query) {
      return matchesSource
    }

    const haystack = [
      item.originalName,
      item.summary,
      ...item.tags
    ].join(' ').toLowerCase()

    return matchesSource && haystack.includes(query)
  })
})

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function sourceLabel(type: EvidenceItem['sourceType']) {
  return {
    text: 'Text / note',
    email: 'Email',
    photo: 'Photo',
    document: 'Document'
  }[type]
}
</script>

<template>
  <UDashboardPanel id="evidence">
    <template #header>
      <UDashboardNavbar title="Evidence">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="q"
              icon="i-lucide-search"
              placeholder="Search evidence"
              class="w-44 sm:w-64"
            />

            <USelect
              v-model="sourceFilter"
              :items="sourceOptions"
              class="min-w-32"
              :ui="{
                trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
              }"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Central library of dummy evidence items fetched from
          <code class="px-1 rounded bg-subtle text-xs text-muted border border-default">/api/evidence</code>.
        </p>

        <UCard v-if="status === 'pending'" class="flex items-center justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="size-5 text-muted animate-spin" />
          <span class="ml-2 text-sm text-muted">Loading evidence…</span>
        </UCard>

        <div
          v-else
          class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          <UCard
            v-for="item in filteredEvidence"
            :key="item.id"
            :ui="{ body: 'flex flex-col gap-2' }"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <UBadge
                  color="neutral"
                  variant="subtle"
                  class="capitalize"
                >
                  {{ sourceLabel(item.sourceType) }}
                </UBadge>

                <p class="font-medium text-highlighted truncate max-w-[12rem] sm:max-w-xs">
                  {{ item.originalName }}
                </p>
              </div>

              <p class="text-xs text-muted">
                {{ formatDate(item.createdAt) }}
              </p>
            </div>

            <p class="text-sm text-muted line-clamp-3">
              {{ item.summary }}
            </p>

            <div class="flex flex-wrap gap-1 mt-1">
              <UBadge
                v-for="tag in item.tags"
                :key="tag"
                color="neutral"
                variant="outline"
                class="text-xs"
              >
                {{ tag }}
              </UBadge>
            </div>
          </UCard>
        </div>

        <UCard
          v-if="!filteredEvidence.length && status === 'success'"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <UIcon name="i-lucide-folder-open" class="size-10 text-dimmed mb-2" />
          <p class="text-sm font-medium text-highlighted">
            No evidence matches this search
          </p>
          <p class="text-xs text-muted">
            Try clearing the search or changing the source filter to explore the dummy evidence set.
          </p>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>


