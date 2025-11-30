import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * GET /api/billing/usage
 * 
 * Returns current usage counts for the authenticated user.
 * Used by useSubscription composable to check against tier limits.
 */
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

  try {
    // Count journal entries
    const { count: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (journalError) {
      console.error('[Usage] Error counting journal entries:', journalError)
    }

    // Count evidence uploads
    const { count: evidenceUploads, error: evidenceError } = await supabase
      .from('evidence')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (evidenceError) {
      console.error('[Usage] Error counting evidence:', evidenceError)
    }

    return {
      journalEntries: journalEntries ?? 0,
      evidenceUploads: evidenceUploads ?? 0
    }
  } catch (err) {
    console.error('[Usage] Error fetching usage counts:', err)
    return {
      journalEntries: 0,
      evidenceUploads: 0
    }
  }
})

