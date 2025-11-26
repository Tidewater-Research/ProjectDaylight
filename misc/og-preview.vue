<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: 'OG Image Preview'
})
</script>

<template>
  <div class="min-h-screen bg-neutral-200 flex items-center justify-center p-8">
    <!-- Outer container with red border for cropping guide -->
    <div
      class="relative"
      style="padding: 20px; box-shadow: 0 0 0 4px #ef4444;"
    >
      <!-- Corner markers outside the actual image area -->
      <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500" />
      <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500" />
      <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500" />
      <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500" />

      <!-- OG Image Container: 1200x630 - THIS IS WHAT YOU SCREENSHOT -->
      <div
        class="og-container relative overflow-hidden"
        style="width: 1200px; height: 630px;"
      >
        <!-- Base gradient background -->
        <div class="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-sky-50" />

        <!-- Decorative circles -->
        <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sky-100/60" />
        <div class="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-sky-50/80" />
        <div class="absolute top-1/2 right-24 w-64 h-64 rounded-full bg-sky-100/40" />

        <!-- Subtle grid pattern -->
        <div
          class="absolute inset-0 opacity-[0.04]"
          style="background-image: linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px); background-size: 60px 60px;"
        />

        <!-- Floating dots decoration -->
        <div class="absolute top-20 left-20 w-3 h-3 rounded-full bg-sky-300/50" />
        <div class="absolute top-32 left-48 w-2 h-2 rounded-full bg-sky-400/40" />
        <div class="absolute bottom-28 right-32 w-4 h-4 rounded-full bg-sky-300/50" />
        <div class="absolute bottom-40 right-64 w-2 h-2 rounded-full bg-sky-400/40" />
        <div class="absolute top-24 right-96 w-2 h-2 rounded-full bg-sky-300/60" />

        <!-- Content -->
        <div class="relative z-10 h-full flex flex-col items-center justify-center gap-8">
          <!-- Logo + Name -->
          <div class="flex items-center gap-6">
            <svg
              width="120"
              height="120"
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="drop-shadow-lg"
            >
              <g transform="translate(40, 40) scale(0.8)">
                <path
                  d="M68 20
                     L380 20
                     Q400 20 400 68
                     L400 332
                     Q400 380 332 380
                     L68 380
                     Q20 380 20 332
                     L20 180
                     A160 160 0 0 0 180 20
                     Z"
                  fill="#0ea5e9"
                />
              </g>
            </svg>
            <span class="font-bold tracking-tight text-slate-900" style="font-family: system-ui, -apple-system, sans-serif; font-size: 7rem;">
              Daylight
            </span>
          </div>

          <!-- Tagline -->
          <p class="text-4xl text-slate-500 font-medium tracking-wide">
            Just talk. We handle the rest.
          </p>

          <!-- Subtle descriptor -->
          <div class="flex items-center gap-3 mt-4">
            <span class="px-4 py-1.5 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">
              Custody Documentation
            </span>
            <span class="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
              Court-Ready Timelines
            </span>
            <span class="px-4 py-1.5 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">
              Voice-to-Evidence
            </span>
          </div>
        </div>

        <!-- Bottom accent bar -->
        <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400" />
      </div>
    </div>

    <!-- Instructions -->
    <div class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm">
      Screenshot the white area inside the red border (1200×630)
    </div>
  </div>
</template>

<style scoped>
.og-container {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

