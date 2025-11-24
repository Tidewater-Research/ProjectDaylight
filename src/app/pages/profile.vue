<script setup lang="ts">
</script>

<template>
  <UDashboardPanel id="profile">
    <template #header>
      <UDashboardNavbar title="Profile">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl space-y-6">
        <UCard>
          <template #header>
            <p class="font-medium text-highlighted">Profile Settings</p>
          </template>
          <p class="text-sm text-muted">
            Profile management coming soon.
          </p>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

