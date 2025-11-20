<script setup lang="ts">
import type { InsightItem } from '~/types'

interface InsightsResponse {
  suggestions: string[]
  recent: InsightItem[]
}

const { data, status } = await useFetch<InsightsResponse>('/api/insights', {
  default: () => ({ suggestions: [], recent: [] }),
  lazy: true
})

const activeQuery = ref('')

const conversation = computed(() => data.value?.recent || [])

function useSuggestion(suggestion: string) {
  activeQuery.value = suggestion
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <UDashboardPanel id="interpreter">
    <template #header>
      <UDashboardNavbar title="Interpreter">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 max-w-3xl">
        <p class="text-sm text-muted">
          Simple AI-style interpreter view powered by static dummy data from
          <code class="px-1 rounded bg-subtle text-xs text-muted border border-default">/api/insights</code>.
        </p>

        <UCard>
          <template #header>
            <p class="font-medium text-highlighted">
              Ask a question about your timeline
            </p>
          </template>

          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="suggestion in data?.suggestions"
                :key="suggestion"
                color="neutral"
                variant="outline"
                size="xs"
                class="rounded-full"
                @click="useSuggestion(suggestion)"
              >
                {{ suggestion }}
              </UButton>
            </div>

            <UTextarea
              v-model="activeQuery"
              :rows="3"
              placeholder="Write a natural language question, e.g. “Show patterns in missed medication doses over the last month.”"
              autoresize
              class="w-full"
            />

            <div class="flex justify-end">
              <UButton
                color="primary"
                icon="i-lucide-sparkles"
                disabled
                variant="solid"
              >
                Run (dummy only)
              </UButton>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium text-highlighted">
                Recent interpretations
              </p>
              <span class="text-xs text-muted">
                Loaded from dummy backend, no live AI calls yet.
              </span>
            </div>
          </template>

          <div v-if="status === 'pending'" class="flex items-center justify-center py-8">
            <ULoadingIcon class="size-5 text-muted" />
            <span class="ml-2 text-sm text-muted">Loading interpretations…</span>
          </div>

          <div
            v-else
            class="space-y-4"
          >
            <div
              v-for="item in conversation"
              :key="item.id"
              class="space-y-1 border-b last:border-b-0 border-default pb-3 last:pb-0"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-highlighted">
                  {{ item.query }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDate(item.createdAt) }}
                </p>
              </div>

              <p class="text-sm text-muted">
                {{ item.response }}
              </p>

              <p
                v-if="item.evidenceIds?.length"
                class="text-xs text-muted flex items-center gap-1"
              >
                <UIcon name="i-lucide-quote" class="size-3.5" />
                Based on {{ item.evidenceIds.length }} linked evidence item(s)
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>


