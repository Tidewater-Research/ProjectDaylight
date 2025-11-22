<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- Minimal header with subtle border -->
    <UHeader
      class="border-b border-default/10 bg-background/80 backdrop-blur-sm"
      :ui="{ root: 'sticky top-0 z-50' }"
    >
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <span class="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-background">
            <UIcon name="i-lucide-sun" class="size-4" />
          </span>
          <span class="text-lg font-medium text-highlighted">
            Daylight
          </span>
        </NuxtLink>
      </template>

      <template #center>
        <nav class="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <NuxtLink to="/home" class="transition hover:text-highlighted">
            Product
          </NuxtLink>
          <NuxtLink to="/timeline" class="transition hover:text-highlighted">
            Features
          </NuxtLink>
          <NuxtLink to="/evidence" class="transition hover:text-highlighted">
            Pricing
          </NuxtLink>
        </nav>
      </template>

      <template #right>
        <div class="flex items-center gap-3">
          <UColorModeButton size="sm" />

          <NuxtLink to="/auth/login" class="hidden sm:block">
            <UButton color="neutral" variant="ghost" size="sm">
              Log in
            </UButton>
          </NuxtLink>

          <NuxtLink to="/auth/signup">
            <UButton
              color="primary"
              size="sm"
            >
              Get started
            </UButton>
          </NuxtLink>
        </div>
      </template>
    </UHeader>

    <!-- Main content -->
    <UMain>
      <slot />
    </UMain>

    <!-- Simple footer -->
    <UFooter class="border-t border-default/10 bg-elevated/30">
      <UContainer class="py-16">
        <div class="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <!-- Brand column -->
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <span class="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-background">
                <UIcon name="i-lucide-sun" class="size-3.5" />
              </span>
              <span class="font-medium text-highlighted">
                Daylight
              </span>
            </div>
            <p class="text-xs text-muted">
              Court-ready documentation for difficult situations.
            </p>
          </div>

          <!-- Product column -->
          <div class="space-y-3">
            <p class="text-xs font-medium uppercase tracking-wider text-muted">
              Product
            </p>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink to="/capture" class="text-muted transition hover:text-highlighted">
                  Capture
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/timeline" class="text-muted transition hover:text-highlighted">
                  Timeline
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/evidence" class="text-muted transition hover:text-highlighted">
                  Evidence
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Resources column -->
          <div class="space-y-3">
            <p class="text-xs font-medium uppercase tracking-wider text-muted">
              Resources
            </p>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink to="/home" class="text-muted transition hover:text-highlighted">
                  Dashboard
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/settings" class="text-muted transition hover:text-highlighted">
                  Settings
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/export" class="text-muted transition hover:text-highlighted">
                  Export
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Legal column -->
          <div class="space-y-3">
            <p class="text-xs font-medium uppercase tracking-wider text-muted">
              Legal
            </p>
            <ul class="space-y-2 text-sm">
              <li>
                <a href="#" class="text-muted transition hover:text-highlighted">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" class="text-muted transition hover:text-highlighted">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" class="text-muted transition hover:text-highlighted">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        <USeparator class="my-8" />

        <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p class="text-xs text-muted">
            © {{ new Date().getFullYear() }} Daylight. All rights reserved.
          </p>
          <div class="flex items-center gap-4">
            <a href="#" class="text-muted transition hover:text-highlighted">
              <UIcon name="i-lucide-twitter" class="size-4" />
            </a>
            <a href="#" class="text-muted transition hover:text-highlighted">
              <UIcon name="i-lucide-github" class="size-4" />
            </a>
          </div>
        </div>
      </UContainer>
    </UFooter>
  </div>
</template>



