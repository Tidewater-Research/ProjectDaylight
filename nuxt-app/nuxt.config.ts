// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', '@nuxtjs/supabase'],

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
    '/api/**': {
      cors: true
    }
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    redirect: false,
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/confirm',
      include: undefined,
      exclude: ['/auth/*', '/']
    },
    clientOptions: {
      auth: {
        detectSessionInUrl: true,
        persistSession: true
      }
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // Add transpile for Supabase modules
  build: {
    transpile: ['@supabase/supabase-js']
  }
})