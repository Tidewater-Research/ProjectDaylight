import type { EvidenceItem } from '~/types'
import type { Tables } from '~/types/database.types'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

type EvidenceRow = Tables<'evidence'>

function mapSourceType(rawType: string | null): EvidenceItem['sourceType'] {
  const normalized = rawType || 'other'

  // Keep this in sync with /api/evidence/[id].ts so list and detail views
  // present the same source type for a given database value.
  if (normalized === 'recording' || normalized === 'other') {
    return 'document'
  }

  return normalized as EvidenceItem['sourceType']
}

function mapEvidenceRowToItem(row: EvidenceRow): EvidenceItem {
  const sourceType = mapSourceType(row.source_type)

  // Generate a meaningful title from available data
  let originalName = row.original_filename || row.storage_path
  
  if (!originalName && row.summary) {
    // Extract a concise title from the summary (first sentence or ~60 chars)
    const summaryText = row.summary.trim()
    const firstSentence = summaryText.split(/[.!?]/)[0]
    originalName = firstSentence.length > 60 
      ? firstSentence.substring(0, 60) + '...'
      : firstSentence
  }
  
  if (!originalName) {
    // Fallback based on source type
    const typeLabel = {
      email: 'Email communication',
      text: 'Text message',
      photo: 'Photo evidence',
      document: 'Document'
    }[sourceType] || 'Evidence item'
    originalName = typeLabel
  }

  return {
    id: row.id,
    sourceType,
    originalName,
    createdAt: row.created_at,
    summary: row.summary || '',
    tags: row.tags || []
  }
}

export default eventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Resolve the authenticated user from the Supabase access token (Authorization header)
  // and fall back to cookie-based auth via serverSupabaseUser.
  let userId: string | null = null

  const authHeader = getHeader(event, 'authorization') || getHeader(event, 'Authorization')
  const bearerPrefix = 'Bearer '
  const token = authHeader?.startsWith(bearerPrefix)
    ? authHeader.slice(bearerPrefix.length).trim()
    : undefined

  if (token) {
    const { data: userResult, error: userError } = await supabase.auth.getUser(token)

    if (userError) {
      // eslint-disable-next-line no-console
      console.error('Supabase auth.getUser error (evidence):', userError)
    } else {
      userId = userResult.user?.id ?? null
    }
  }

  if (!userId) {
    const authUser = await serverSupabaseUser(event)
    userId = authUser?.id ?? null
  }

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User is not authenticated. Please sign in through Supabase and include the session token in the request.'
    })
  }

  const { data, error } = await supabase
    .from('evidence')
    .select('id, source_type, original_filename, storage_path, summary, tags, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Supabase select evidence error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load evidence.'
    })
  }

  const rows = (data ?? []) as EvidenceRow[]
  return rows.map(mapEvidenceRowToItem)
})


