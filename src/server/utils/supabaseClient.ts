import { getHeader, createError, type H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export async function getSupabaseClient(event: H3Event) {
  // Uses @nuxtjs/supabase server service-role client, configured via
  // SUPABASE_URL + SUPABASE_SECRET_KEY (or supabase.secretKey in nuxt.config).
  return await serverSupabaseServiceRole(event)
}

export async function getRequestUserId(event: H3Event): Promise<string> {
  // Prefer the authenticated Supabase user when available.
  const authUser = await serverSupabaseUser(event)

  if (authUser?.id) {
    return authUser.id
  }

  // Development fallbacks:
  // - Prefer an explicit header so you can spoof different users in development.
  // - Fall back to a DAYLIGHT_DEV_USER_ID env var for single‑user local testing.
  const headerUserId = getHeader(event, 'x-daylight-user-id')
  const fallbackUserId = process.env.DAYLIGHT_DEV_USER_ID

  const userId = headerUserId || fallbackUserId

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User is not authenticated. Provide X-Daylight-User-Id header, configure DAYLIGHT_DEV_USER_ID, or authenticate with Supabase.'
    })
  }

  return userId
}


