/**
 * Composable for checking user subscription tier and feature access.
 * 
 * Features:
 * - Fetches subscription data from /api/billing
 * - Provides tier checks (isFree, isPro, isAlpha)
 * - Provides feature gates (canCreateJournalEntry, canUploadEvidence, canExport)
 * - Tracks usage counts for limits
 */

import type { Subscription, PlanTier } from '~/types'

// Tier limits
export const TIER_LIMITS = {
  free: {
    journalEntries: 5,
    evidenceUploads: 10,
    canExport: false,
    canUseAiInsights: false
  },
  alpha: {
    journalEntries: Infinity,
    evidenceUploads: Infinity,
    canExport: true,
    canUseAiInsights: true
  },
  pro: {
    journalEntries: Infinity,
    evidenceUploads: Infinity,
    canExport: true,
    canUseAiInsights: true
  },
  starter: {
    journalEntries: 20,
    evidenceUploads: 50,
    canExport: true,
    canUseAiInsights: false
  },
  enterprise: {
    journalEntries: Infinity,
    evidenceUploads: Infinity,
    canExport: true,
    canUseAiInsights: true
  }
} as const

interface UsageCounts {
  journalEntries: number
  evidenceUploads: number
}

interface SubscriptionState {
  subscription: Subscription | null
  usage: UsageCounts
  isLoading: boolean
  isFetched: boolean
}

export function useSubscription() {
  const user = useSupabaseUser()
  
  // Helper to get user ID
  const getUserId = () => (user.value as any)?.id || (user.value as any)?.sub
  
  // Reactive state
  const state = useState<SubscriptionState>('user-subscription', () => ({
    subscription: null,
    usage: { journalEntries: 0, evidenceUploads: 0 },
    isLoading: false,
    isFetched: false
  }))

  // Current tier (defaults to 'free' if no subscription)
  const tier = computed<PlanTier>(() => {
    const sub = state.value.subscription
    if (!sub) return 'free'
    if (sub.status !== 'active' && sub.status !== 'trialing') return 'free'
    return sub.planTier
  })

  // Tier booleans
  const isFree = computed(() => tier.value === 'free')
  const isPro = computed(() => tier.value === 'pro')
  const isAlpha = computed(() => tier.value === 'alpha')
  const hasPremiumAccess = computed(() => isPro.value || isAlpha.value || tier.value === 'enterprise')

  // Get limits for current tier
  const limits = computed(() => TIER_LIMITS[tier.value] || TIER_LIMITS.free)

  // Usage counts
  const journalEntryCount = computed(() => state.value.usage.journalEntries)
  const evidenceUploadCount = computed(() => state.value.usage.evidenceUploads)

  // Feature gates
  const canCreateJournalEntry = computed(() => {
    if (hasPremiumAccess.value) return true
    return state.value.usage.journalEntries < limits.value.journalEntries
  })

  const canUploadEvidence = computed(() => {
    if (hasPremiumAccess.value) return true
    return state.value.usage.evidenceUploads < limits.value.evidenceUploads
  })

  const canExport = computed(() => limits.value.canExport)
  const canUseAiInsights = computed(() => limits.value.canUseAiInsights)

  // Remaining counts
  const journalEntriesRemaining = computed(() => {
    if (hasPremiumAccess.value) return Infinity
    return Math.max(0, limits.value.journalEntries - state.value.usage.journalEntries)
  })

  const evidenceUploadsRemaining = computed(() => {
    if (hasPremiumAccess.value) return Infinity
    return Math.max(0, limits.value.evidenceUploads - state.value.usage.evidenceUploads)
  })

  // Fetch subscription and usage data
  async function fetchSubscription(): Promise<void> {
    if (!getUserId()) return

    state.value.isLoading = true
    try {
      // Fetch subscription info
      const billingData = await $fetch<{ subscription: Subscription | null }>('/api/billing')
      state.value.subscription = billingData.subscription

      // Fetch usage counts
      const usageData = await $fetch<{ journalEntries: number; evidenceUploads: number }>('/api/billing/usage')
      state.value.usage = usageData

      state.value.isFetched = true
    } catch (err: any) {
      // 401 is expected on public routes
      if (err?.statusCode !== 401) {
        console.error('[useSubscription] Error fetching subscription:', err)
      }
    } finally {
      state.value.isLoading = false
    }
  }

  // Increment usage (call after successful creation)
  function incrementJournalEntryCount() {
    state.value.usage.journalEntries++
  }

  function incrementEvidenceUploadCount() {
    state.value.usage.evidenceUploads++
  }

  // Refresh subscription data
  async function refresh() {
    state.value.isFetched = false
    await fetchSubscription()
  }

  // Initialize on auth change
  watch(user, async (newUser) => {
    const userId = (newUser as any)?.id || (newUser as any)?.sub
    if (userId) {
      if (!state.value.isFetched) {
        await fetchSubscription()
      }
    } else {
      // Clear state on logout
      state.value.subscription = null
      state.value.usage = { journalEntries: 0, evidenceUploads: 0 }
      state.value.isFetched = false
    }
  }, { immediate: true })

  return {
    // State
    subscription: computed(() => state.value.subscription),
    isLoading: computed(() => state.value.isLoading),
    isFetched: computed(() => state.value.isFetched),
    
    // Tier info
    tier,
    isFree,
    isPro,
    isAlpha,
    hasPremiumAccess,
    limits,
    
    // Usage
    journalEntryCount,
    evidenceUploadCount,
    journalEntriesRemaining,
    evidenceUploadsRemaining,
    
    // Feature gates
    canCreateJournalEntry,
    canUploadEvidence,
    canExport,
    canUseAiInsights,
    
    // Actions
    fetchSubscription,
    refresh,
    incrementJournalEntryCount,
    incrementEvidenceUploadCount
  }
}

