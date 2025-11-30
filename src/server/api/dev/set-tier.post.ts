import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { PlanTier } from '~/types'

/**
 * POST /api/dev/set-tier
 * 
 * Allows employees to change their subscription tier for testing.
 * In development: available to all users
 * In production: only available to users with is_employee=true in their profile
 * 
 * RLS policies allow employees to manage their own subscription records.
 */

interface SetTierBody {
  tier: PlanTier
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const authUser = await serverSupabaseUser(event)
  const userId = authUser?.sub || authUser?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Please log in'
    })
  }

  // Check if user is an employee (required in production, optional in dev)
  const isDev = process.env.NODE_ENV === 'development' || process.env.NUXT_PUBLIC_DEV_MODE === 'true'
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_employee')
    .eq('id', userId)
    .single()

  const isEmployee = profile?.is_employee === true

  // In production, only employees can use this endpoint
  if (!isDev && !isEmployee) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This feature is only available to employees'
    })
  }

  console.log('[Dev Set Tier] User:', userId, 'isEmployee:', isEmployee, 'isDev:', isDev)

  const body = await readBody<SetTierBody>(event)
  const tier = body?.tier

  if (!tier || !['free', 'alpha', 'pro', 'starter', 'enterprise'].includes(tier)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tier. Must be one of: free, alpha, pro, starter, enterprise'
    })
  }

  console.log('[Dev Set Tier] Target tier:', tier)

  try {
    if (tier === 'free') {
      // For free tier, delete the subscription record
      console.log('[Dev Set Tier] Deleting subscription for free tier...')
      const { error } = await (supabase as any)
        .from('subscriptions')
        .delete()
        .eq('user_id', userId)

      if (error && error.code !== 'PGRST116') {
        console.error('[Dev Set Tier] Error deleting subscription:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update tier'
        })
      }

      console.log('[Dev Set Tier] Subscription deleted successfully')
      return { success: true, tier: 'free', message: 'Subscription deleted - now on free tier' }
    }

    // For other tiers, upsert a subscription record
    console.log('[Dev Set Tier] Upserting subscription for tier:', tier)
    const now = new Date().toISOString()
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_tier: tier,
        status: 'active',
        billing_interval: 'year',
        current_period_start: now,
        current_period_end: oneYearFromNow,
        cancel_at_period_end: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        updated_at: now
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[Dev Set Tier] Error upserting subscription:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update tier'
      })
    }

    console.log('[Dev Set Tier] Subscription upserted successfully:', data)
    return { 
      success: true, 
      tier, 
      message: `Subscription updated to ${tier} tier`,
      subscription: data
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    
    console.error('[Dev] Set tier error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update tier'
    })
  }
})

