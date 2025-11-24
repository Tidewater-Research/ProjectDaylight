<script setup lang="ts">
</script>

<template>
  <UDashboardPanel id="chat">
    <template #header>
      <UDashboardNavbar title="Chat">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex items-center justify-center h-full">
        <div class="text-center space-y-4 max-w-md">
          <UIcon 
            name="i-lucide-message-circle" 
            class="size-16 text-muted mx-auto"
          />
          <div class="space-y-2">
            <h2 class="text-2xl font-semibold text-highlighted">
              Chat Coming Soon
            </h2>
            <p class="text-sm text-muted">
              We're working on an AI-powered chat interface to help you explore and understand your timeline data.
            </p>
          </div>
          <UBadge color="primary" variant="subtle" size="lg">
            Coming Soon
          </UBadge>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

