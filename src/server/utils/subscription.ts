import { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { PlanTier } from '~/types'

// Tier limits (mirrored from composable for server-side use)
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

interface SubscriptionRow {
  plan_tier: PlanTier
  status: string
}

/**
 * Get the user's current subscription tier.
 * Returns 'free' if no active subscription exists.
 */
export async function getUserTier(event: H3Event, userId: string): Promise<PlanTier> {
  const supabase = await serverSupabaseClient(event)

  try {
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .select('plan_tier, status')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('[Subscription] Error fetching tier:', error)
      return 'free'
    }

    if (!data) return 'free'
    
    const row = data as SubscriptionRow
    // Only count active or trialing subscriptions
    if (row.status !== 'active' && row.status !== 'trialing') {
      return 'free'
    }

    return row.plan_tier || 'free'
  } catch (err) {
    console.error('[Subscription] Error getting user tier:', err)
    return 'free'
  }
}

/**
 * Check if user can create a new journal entry.
 * Premium users have unlimited entries.
 */
export async function canCreateJournalEntry(event: H3Event, userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const tier = await getUserTier(event, userId)
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free

  // Premium tiers have unlimited
  if (limits.journalEntries === Infinity) {
    return { allowed: true }
  }

  const supabase = await serverSupabaseClient(event)

  // Count existing journal entries
  const { count, error } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('[Subscription] Error counting journal entries:', error)
    // Allow on error to avoid blocking users
    return { allowed: true }
  }

  const currentCount = count ?? 0
  const remaining = limits.journalEntries - currentCount

  if (currentCount >= limits.journalEntries) {
    return {
      allowed: false,
      reason: `Free plan limit reached (${limits.journalEntries} journal entries). Upgrade to Pro for unlimited entries.`,
      remaining: 0
    }
  }

  return { allowed: true, remaining }
}

/**
 * Check if user can upload more evidence.
 * Premium users have unlimited uploads.
 */
export async function canUploadEvidence(event: H3Event, userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const tier = await getUserTier(event, userId)
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free

  // Premium tiers have unlimited
  if (limits.evidenceUploads === Infinity) {
    return { allowed: true }
  }

  const supabase = await serverSupabaseClient(event)

  // Count existing evidence
  const { count, error } = await supabase
    .from('evidence')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('[Subscription] Error counting evidence:', error)
    // Allow on error to avoid blocking users
    return { allowed: true }
  }

  const currentCount = count ?? 0
  const remaining = limits.evidenceUploads - currentCount

  if (currentCount >= limits.evidenceUploads) {
    return {
      allowed: false,
      reason: `Free plan limit reached (${limits.evidenceUploads} evidence uploads). Upgrade to Pro for unlimited uploads.`,
      remaining: 0
    }
  }

  return { allowed: true, remaining }
}

/**
 * Check if user can create exports.
 * Only Pro/Alpha users can export.
 */
export async function canExport(event: H3Event, userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await getUserTier(event, userId)
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free

  if (!limits.canExport) {
    return {
      allowed: false,
      reason: 'Exports are a Pro feature. Upgrade to create court-ready documents.'
    }
  }

  return { allowed: true }
}

