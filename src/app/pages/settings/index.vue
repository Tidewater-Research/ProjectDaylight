<script setup lang="ts">
import { TIMEZONE_OPTIONS, getAllTimezones, detectBrowserTimezone } from '~/composables/useTimezone'

const { timezone, saveTimezone, isLoading } = useTimezone()
const toast = useToast()

// Local state for timezone selection
const selectedTimezone = ref(timezone.value)

// Watch for external timezone changes
watch(timezone, (newTz) => {
  selectedTimezone.value = newTz
})

// Get all available timezones
const allTimezones = getAllTimezones()

// Common timezone options with full list
const timezoneItems = computed(() => {
  // Create items for USelectMenu
  return allTimezones.map(tz => ({
    label: tz.label,
    value: tz.value
  }))
})

// Format selected timezone for display
const selectedTimezoneLabel = computed(() => {
  const found = allTimezones.find(tz => tz.value === selectedTimezone.value)
  return found?.label || selectedTimezone.value
})

// Detect browser timezone
function detectTimezone() {
  const detected = detectBrowserTimezone()
  selectedTimezone.value = detected
  handleSaveTimezone()
}

// Save timezone
async function handleSaveTimezone() {
  const success = await saveTimezone(selectedTimezone.value)
  
  if (success) {
    toast.add({
      title: 'Timezone updated',
      description: `Your timezone has been set to ${selectedTimezoneLabel.value}`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } else {
    toast.add({
      title: 'Failed to update timezone',
      description: 'Please try again later.',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Check if timezone has changed
const hasTimezoneChanged = computed(() => {
  return selectedTimezone.value !== timezone.value
})
</script>

<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-2xl space-y-6">
        <!-- Timezone Settings -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-globe" class="size-5 text-primary" />
              <div>
                <p class="font-medium text-highlighted">Timezone</p>
                <p class="text-xs text-muted mt-0.5">
                  Your timezone affects how dates are displayed and when "today" starts
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-highlighted">Your Timezone</label>
              <div class="flex gap-2">
                <USelectMenu
                  v-model="selectedTimezone"
                  :items="timezoneItems"
                  value-key="value"
                  placeholder="Select timezone..."
                  searchable
                  searchable-placeholder="Search timezones..."
                  class="flex-1"
                >
                  <template #default>
                    <span class="truncate">{{ selectedTimezoneLabel }}</span>
                  </template>
                </USelectMenu>
                
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-locate"
                  @click="detectTimezone"
                >
                  Detect
                </UButton>
              </div>
              <p class="text-xs text-muted">
                Current: {{ selectedTimezoneLabel }}
              </p>
            </div>

            <div v-if="hasTimezoneChanged" class="flex justify-end">
              <UButton
                color="primary"
                :loading="isLoading"
                @click="handleSaveTimezone"
              >
                Save Changes
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Quick Timezone Presets -->
        <UCard>
          <template #header>
            <p class="font-medium text-highlighted">Quick Select</p>
          </template>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <UButton
              v-for="tz in TIMEZONE_OPTIONS"
              :key="tz.value"
              :variant="selectedTimezone === tz.value ? 'solid' : 'soft'"
              :color="selectedTimezone === tz.value ? 'primary' : 'neutral'"
              size="sm"
              class="justify-start"
              @click="selectedTimezone = tz.value; handleSaveTimezone()"
            >
              {{ tz.label }}
            </UButton>
          </div>
        </UCard>

        <!-- Additional Settings Placeholder -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-settings" class="size-5 text-primary" />
              <p class="font-medium text-highlighted">More Settings</p>
            </div>
          </template>
          <p class="text-sm text-muted">
            Additional settings coming soon, including notification preferences and display options.
          </p>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
