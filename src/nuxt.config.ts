// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxtjs/supabase',
    '@vueuse/nuxt',
    '@nuxtjs/mdc'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Private runtime configuration (only available on the server)
  runtimeConfig: {
    openai: {
      // Make sure you have OPENAI_API_KEY set in your .env file
      apiKey: process.env.OPENAI_API_KEY
    }
  },

  routeRules: {
    '/': { prerender: true },
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2025-01-15',

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false // We'll handle redirects manually for the test page
  },

  // Ensure Supabase modules are transpiled correctly for ESM / prerender
  build: {
    transpile: [
      '@supabase/supabase-js',
      '@supabase/auth-js',
      '@supabase/functions-js',
      '@supabase/postgrest-js',
      '@supabase/realtime-js',
      '@supabase/storage-js'
    ]
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})