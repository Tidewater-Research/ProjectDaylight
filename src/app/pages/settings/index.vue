<script setup lang="ts">
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
      <div class="max-w-4xl space-y-6">
        <UCard>
          <template #header>
            <p class="font-medium text-highlighted">App Settings</p>
          </template>
          <p class="text-sm text-muted">
            Application settings coming soon.
          </p>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

