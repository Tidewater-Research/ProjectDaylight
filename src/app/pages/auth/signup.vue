<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const state = reactive({
  email: '',
  password: ''
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
const loading = ref(false)
const formError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

type Schema = typeof state

function validate(current: Partial<Schema>): FormError[] {
  const errors: FormError[] = []

  if (!current.email) {
    errors.push({ name: 'email', message: 'Email is required' })
  }

  if (!current.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  }

  return errors
}

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true
    formError.value = null
    successMessage.value = null

    const redirectTo = process.client ? `${window.location.origin}/auth/confirm` : undefined

    const { data, error } = await supabase.auth.signUp({
      email: state.email,
      password: state.password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined
    })

    if (error) {
      formError.value = error.message
      return
    }

    // If a session exists, user can be sent straight into the app.
    if (data.session) {
      await router.push('/home')
      return
    }

    successMessage.value = 'Check your email to confirm your account before signing in.'
  } catch (error: any) {
    formError.value = error?.message || 'Unable to sign up. Please try again.'
  } finally {
    loading.value = false
  }
}

async function signUpWithGoogle() {
  try {
    loading.value = true
    formError.value = null

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`
      }
    })
    
    if (error) {
      console.error('Google sign-up error:', error)
      formError.value = error.message
    }
    // Browser will redirect to Google; no further handling needed here.
  } catch (error: any) {
    console.error('Unexpected error:', error)
    formError.value = error?.message || 'Unable to continue with Google.'
  } finally {
    loading.value = false
  }
}

watchEffect(() => {
  if (user.value) {
    router.replace('/home')
  }
})
</script>

<template>
  <UCard>
    <div class="space-y-6">
      <div class="space-y-1 text-center">
        <h1 class="text-xl font-semibold text-highlighted">
          Create an account
        </h1>
        <p class="text-sm text-muted">
          Enter your email below to create your account.
        </p>
      </div>

      <UForm
        :state="state"
        :validate="validate"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          v-if="formError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="formError"
        />

        <UAlert
          v-if="successMessage"
          color="success"
          variant="soft"
          icon="i-lucide-check-circle-2"
          :title="successMessage"
        />

        <UFormField label="Email" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="name@example.com"
            color="neutral"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            color="neutral"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          class="mt-2"
          :loading="loading"
        >
          Sign up with Email
        </UButton>
      </UForm>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-default" />
        </div>
        <div class="relative flex justify-center text-xs text-muted">
          <span class="bg-default px-2">Or continue with</span>
        </div>
      </div>

      <UButton
        color="neutral"
        variant="outline"
        block
        icon="i-simple-icons-google"
        :loading="loading"
        @click="signUpWithGoogle"
      >
        Continue with Google
      </UButton>

      <p class="text-[11px] leading-relaxed text-muted text-center">
        By clicking continue, you agree to our
        <NuxtLink to="#" class="underline underline-offset-2 hover:text-highlighted">
          Terms of Service
        </NuxtLink>
        and
        <NuxtLink to="#" class="underline underline-offset-2 hover:text-highlighted">
          Privacy Policy
        </NuxtLink>.
      </p>

      <p class="text-sm text-muted text-center">
        Already have an account?
        <NuxtLink to="/auth/login" class="font-medium text-highlighted hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </div>
  </UCard>
</template>


