<script setup lang="ts">
const appName = 'Acme Inc'
</script>

<template>
  <div class="min-h-screen bg-default text-default flex">
    <!-- Left side: brand + quote -->
    <div
      class="hidden md:flex flex-1 flex-col justify-between border-default bg-elevated/40 px-10 py-8 rounded-none"
    >
      <div class="flex items-center gap-2 text-sm font-semibold text-highlighted">
        <UIcon name="i-lucide-command" class="size-5" />
        <span>{{ appName }}</span>
      </div>

      <p class="max-w-sm text-xs text-muted">
        “This library has saved me countless hours of work and helped me deliver stunning designs to my
        clients faster than ever before.” – Sofia Davis
      </p>
    </div>

    <!-- Right side: auth card -->
    <div class="flex-1 flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>



