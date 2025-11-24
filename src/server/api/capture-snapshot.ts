import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface CaptureEventSummary {
  id: string
  type: string
  title: string
  description: string
  primaryTimestamp: string | null
  location: string | null
  childInvolved: boolean
  welfareImpact: string
}

interface CaptureEvidenceSummary {
  id: string
  sourceType: string
  summary: string | null
  tags: string[]
  createdAt: string
  originalName: string | null
}

interface CaptureSnapshotResponse {
  events: CaptureEventSummary[]
  evidence: CaptureEvidenceSummary[]
}

export default defineEventHandler(async (event): Promise<CaptureSnapshotResponse> => {
  // Add logging to diagnose authentication issues
  console.log('capture-snapshot: Starting request')

  // Get the authenticated user from the Nuxt Supabase module
  const user = await serverSupabaseUser(event)
  console.log('capture-snapshot: User from serverSupabaseUser:', user ? { id: user.id, email: user.email } : null)

  if (!user?.id) {
    console.error('capture-snapshot: No authenticated user found')
    throw createError({
      statusCode: 401,
      statusMessage: 'User is not authenticated. Please sign in with Supabase auth and try again.'
    })
  }

  const userId = user.id
  console.log('capture-snapshot: Using userId:', userId)

  // Get the Supabase service role client for database operations
  const supabase = await serverSupabaseServiceRole(event)

  const [
    { data: eventsRows, error: eventsError },
    { data: evidenceRows, error: evidenceError }
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, type, title, description, primary_timestamp, location, child_involved, welfare_impact')
      .eq('user_id', userId)
      .order('primary_timestamp', { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from('evidence')
      .select('id, source_type, summary, tags, created_at, original_filename, storage_path')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
  ])

  if (eventsError) {
    // eslint-disable-next-line no-console
    console.error('Failed to load events for capture snapshot:', eventsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load events.'
    })
  }

  if (evidenceError) {
    // eslint-disable-next-line no-console
    console.error('Failed to load evidence for capture snapshot:', evidenceError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load evidence.'
    })
  }

  const events: CaptureEventSummary[] = (eventsRows ?? []).map((row: any) => ({
    id: row.id as string,
    type: row.type as string,
    title: (row.title as string) || 'Untitled event',
    description: row.description as string,
    primaryTimestamp: (row.primary_timestamp as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    childInvolved: Boolean(row.child_involved),
    welfareImpact: (row.welfare_impact as string) ?? 'unknown'
  }))

  const evidence: CaptureEvidenceSummary[] = (evidenceRows ?? []).map((row: any) => ({
    id: row.id as string,
    sourceType: row.source_type as string,
    summary: (row.summary as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    createdAt: row.created_at as string,
    originalName: (row.original_filename as string | null) ?? (row.storage_path as string | null)
  }))

  return {
    events,
    evidence
  }
})


