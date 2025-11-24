import type { TimelineEvent } from '~/types'
import type { Tables } from '~/types/database.types'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

type EventRow = Tables<'events'>

interface HomeSummary {
  todayEvents: number
  incidentsThisWeek: number
  positiveThisWeek: number
  totalEvents: number
  totalEvidence: number
  totalCommunications: number
  nextCourtDate?: string
  lastCaptureAt?: string
}

interface HomeResponse {
  summary: HomeSummary
  recentEvents: TimelineEvent[]
}

function mapEventToTimelineEvent(row: EventRow): TimelineEvent {
  return {
    id: row.id,
    timestamp: (row.primary_timestamp as string | null) ?? (row.created_at as string),
    type: row.type as TimelineEvent['type'],
    title: row.title,
    description: row.description,
    participants: ['You'],
    location: row.location ?? undefined,
    evidenceIds: undefined
  }
}

export default eventHandler(async (event): Promise<HomeResponse> => {
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
      console.error('Supabase auth.getUser error (home):', userError)
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
      statusMessage:
        'User is not authenticated. Please sign in through Supabase and include the session token in the request.'
    })
  }

  const [
    { data: eventsRows, error: eventsError },
    { data: evidenceRows, error: evidenceError },
    { data: communicationsRows, error: communicationsError }
  ] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, type, title, description, primary_timestamp, location, created_at'
      )
      .eq('user_id', userId)
      .order('primary_timestamp', { ascending: false, nullsFirst: false }),
    supabase
      .from('evidence')
      .select('id')
      .eq('user_id', userId),
    supabase
      .from('communications')
      .select('id')
      .eq('user_id', userId)
  ])

  if (eventsError) {
    // eslint-disable-next-line no-console
    console.error('Supabase select events error (home):', eventsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load home data.'
    })
  }

  if (evidenceError) {
    // eslint-disable-next-line no-console
    console.error('Supabase select evidence error (home):', evidenceError)
  }

  if (communicationsError) {
    // eslint-disable-next-line no-console
    console.error('Supabase select communications error (home):', communicationsError)
  }

  const events = (eventsRows ?? []) as EventRow[]
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)

  let todayEvents = 0
  let incidentsThisWeek = 0
  let positiveThisWeek = 0
  let lastCaptureAt: string | undefined
  let nextCourtDate: string | undefined

  for (const row of events) {
    const tsStr = (row.primary_timestamp as string | null) ?? (row.created_at as string)
    const ts = new Date(tsStr)

    if (!Number.isNaN(ts.getTime())) {
      if (!lastCaptureAt || ts > new Date(lastCaptureAt)) {
        lastCaptureAt = ts.toISOString()
      }

      if (ts >= startOfToday) {
        todayEvents++
      }

      if (ts >= weekAgo) {
        if (row.type === 'incident') {
          incidentsThisWeek++
        } else if (row.type === 'positive') {
          positiveThisWeek++
        }
      }

      if (row.type === 'legal' && ts >= now) {
        if (!nextCourtDate || ts < new Date(nextCourtDate)) {
          nextCourtDate = ts.toISOString()
        }
      }
    }
  }

  const summary: HomeSummary = {
    todayEvents,
    incidentsThisWeek,
    positiveThisWeek,
    totalEvents: events.length,
    totalEvidence: (evidenceRows ?? []).length,
    totalCommunications: (communicationsRows ?? []).length,
    nextCourtDate,
    lastCaptureAt
  }

  const recentEvents = events.slice(0, 5).map(mapEventToTimelineEvent)

  return {
    summary,
    recentEvents
  }
})


