<script setup lang="ts">
</script>

<template>
  <UDashboardPanel id="billing">
    <template #header>
      <UDashboardNavbar title="Billing">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl space-y-6">
        <UCard>
          <template #header>
            <p class="font-medium text-highlighted">Billing & Plans</p>
          </template>
          <p class="text-sm text-muted">
            Billing management coming soon.
          </p>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

