<script setup lang="ts">
import type { ExportJob, ExportPreset } from '~/types'

interface ExportsResponse {
  presets: ExportPreset[]
  recentJobs: ExportJob[]
}

const { data, status } = await useFetch<ExportsResponse>('/api/exports', {
  default: () => ({ presets: [], recentJobs: [] }),
  lazy: true
})

const jobs = computed(() => data.value?.recentJobs || [])

function formatDate(value?: string) {
  if (!value) return '—'

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusBadge(status: ExportJob['status']) {
  const map: Record<ExportJob['status'], { label: string; color: 'neutral' | 'success' | 'error' }> = {
    pending: {
      label: 'Pending',
      color: 'neutral'
    },
    completed: {
      label: 'Ready',
      color: 'success'
    },
    failed: {
      label: 'Failed',
      color: 'error'
    }
  }

  return map[status]
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
          One‑click export presets and recent jobs, backed by static dummy data from
          <code class="px-1 rounded bg-subtle text-xs text-muted border border-default">/api/exports</code>.
        </p>

        <div class="grid gap-3 md:grid-cols-3">
          <UCard
            v-for="preset in data?.presets"
            :key="preset.id"
          >
            <template #header>
              <p class="font-medium text-highlighted">
                {{ preset.label }}
              </p>
              <p class="text-xs text-muted">
                {{ preset.range }}
              </p>
            </template>

            <p class="text-sm text-muted mb-3">
              {{ preset.description }}
            </p>

            <template #footer>
              <UButton
                label="Generate (dummy)"
                icon="i-lucide-file-down"
                color="primary"
                disabled
                block
              />
            </template>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <p class="font-medium text-highlighted">
              Recent export jobs
            </p>
          </template>

          <div v-if="status === 'pending'" class="flex items-center justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="size-5 text-muted animate-spin" />
            <span class="ml-2 text-sm text-muted">Loading exports…</span>
          </div>

          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-muted border-b border-default">
                  <th class="py-2 pr-4 font-normal">
                    Label
                  </th>
                  <th class="py-2 px-4 font-normal">
                    Status
                  </th>
                  <th class="py-2 px-4 font-normal">
                    Created
                  </th>
                  <th class="py-2 px-4 font-normal">
                    Ready
                  </th>
                  <th class="py-2 pl-4 font-normal text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="job in jobs"
                  :key="job.id"
                  class="border-b last:border-b-0 border-default"
                >
                  <td class="py-2 pr-4">
                    <p class="text-sm text-highlighted">
                      {{ job.label }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ job.id }}
                    </p>
                  </td>
                  <td class="py-2 px-4">
                    <UBadge
                      :color="statusBadge(job.status).color"
                      variant="subtle"
                      class="text-xs"
                    >
                      {{ statusBadge(job.status).label }}
                    </UBadge>
                  </td>
                  <td class="py-2 px-4 text-xs text-muted">
                    {{ formatDate(job.createdAt) }}
                  </td>
                  <td class="py-2 px-4 text-xs text-muted">
                    {{ formatDate(job.readyAt) }}
                  </td>
                  <td class="py-2 pl-4 text-right">
                    <UButton
                      v-if="job.status === 'completed'"
                      color="neutral"
                      variant="outline"
                      size="xs"
                      icon="i-lucide-download"
                    >
                      Download (dummy)
                    </UButton>
                    <span
                      v-else
                      class="text-xs text-muted"
                    >
                      Not ready
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>


