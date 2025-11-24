import type { TimelineEvent } from '~/types'
import type { Tables } from '~/types/database.types'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

type EventRow = Tables<'events'>
type EventParticipantRow = Tables<'event_participants'>
type EventEvidenceRow = Tables<'event_evidence'>
type EvidenceMentionRow = Tables<'evidence_mentions'>
type ActionItemRow = Tables<'action_items'>
type CommunicationRow = Tables<'communications'>
type EventEvidenceSuggestionRow = Tables<'event_evidence_suggestions'>

interface EventDetailResponse extends TimelineEvent {
  // Additional fields from the database
  childInvolved?: boolean
  agreementViolation?: boolean
  safetyConcern?: boolean
  welfareImpact?: string
  durationMinutes?: number
  timestampPrecision?: string
  createdAt: string
  updatedAt: string
  
  // Related data
  evidenceDetails?: Array<{
    id: string
    sourceType: string
    originalName?: string
    summary?: string
    tags: string[]
    isPrimary: boolean
  }>
  
  evidenceMentions?: Array<{
    id: string
    type: string
    description: string
    status: string
  }>
  
  actionItems?: Array<{
    id: string
    priority: string
    type: string
    description: string
    deadline?: string
    status: string
  }>
  
  communications?: Array<{
    id: string
    medium: string
    direction: string
    subject?: string
    summary: string
    sentAt?: string
  }>
  
  suggestedEvidence?: Array<{
    id: string
    evidenceType: string
    evidenceStatus: string
    description: string
    fulfilledEvidenceId?: string
    fulfilledAt?: string
    dismissedAt?: string
  }>
}

interface UpdateEventBody {
  title?: string
  description?: string
  type?: TimelineEvent['type']
  timestamp?: string | null
  timestampPrecision?: EventRow['timestamp_precision'] | null
  location?: string | null
  durationMinutes?: number | null
  childInvolved?: boolean | null
  agreementViolation?: boolean | null
  safetyConcern?: boolean | null
  welfareImpact?: EventRow['welfare_impact'] | null
}

function mapEventToDetailResponse(
  row: EventRow,
  participants: string[],
  evidenceRows: any[],
  evidenceMentions: EvidenceMentionRow[],
  actionItems: ActionItemRow[],
  communications: CommunicationRow[],
  suggestions: EventEvidenceSuggestionRow[]
): EventDetailResponse {
  return {
    id: row.id,
    timestamp: row.primary_timestamp || row.created_at,
    type: row.type as TimelineEvent['type'],
    title: row.title || 'Untitled Event',
    description: row.description || '',
    participants,
    location: row.location || undefined,
    evidenceIds: evidenceRows.map(e => e.evidence_id),
    
    // Additional fields
    childInvolved: row.child_involved || undefined,
    agreementViolation: row.agreement_violation || undefined,
    safetyConcern: row.safety_concern || undefined,
    welfareImpact: row.welfare_impact || undefined,
    durationMinutes: row.duration_minutes || undefined,
    timestampPrecision: row.timestamp_precision || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    
    // Related data
    evidenceDetails: evidenceRows.map(e => ({
      id: e.evidence_id,
      sourceType: e.source_type || 'unknown',
      originalName: e.original_filename,
      summary: e.summary,
      tags: e.tags || [],
      isPrimary: e.is_primary || false
    })),
    
    evidenceMentions: evidenceMentions.map(em => ({
      id: em.id,
      type: em.type,
      description: em.description,
      status: em.status
    })),
    
    actionItems: actionItems.map(ai => ({
      id: ai.id,
      priority: ai.priority,
      type: ai.type,
      description: ai.description,
      deadline: ai.deadline || undefined,
      status: ai.status
    })),
    
    communications: communications.map(c => ({
      id: c.id,
      medium: c.medium,
      direction: c.direction,
      subject: c.subject || undefined,
      summary: c.summary,
      sentAt: c.sent_at || undefined
    })),
    
    suggestedEvidence: suggestions.map(se => ({
      id: se.id,
      evidenceType: se.evidence_type || 'other',
      evidenceStatus: se.evidence_status || 'need_to_get',
      description: se.description,
      fulfilledEvidenceId: se.fulfilled_evidence_id || undefined,
      fulfilledAt: se.fulfilled_at || undefined,
      dismissedAt: se.dismissed_at || undefined
    }))
  }
}

export default eventHandler(async (event): Promise<EventDetailResponse> => {
  const supabase = await serverSupabaseServiceRole(event)
  const eventId = getRouterParam(event, 'id')
  
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required.'
    })
  }

  // Resolve authenticated user from cookies/JWT (SSR and serverless safe)
  const authUser = await serverSupabaseUser(event)
  const userId = authUser?.sub || authUser?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Please log in'
    })
  }

  const method = getMethod(event)

  if (method && method.toUpperCase() !== 'GET') {
    // Handle simple PATCH/PUT-style updates for core event fields.
    if (method.toUpperCase() !== 'PATCH' && method.toUpperCase() !== 'PUT') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    const body = await readBody<UpdateEventBody>(event)

    const update: Tables<'events'>['Update'] = {}

    if (body.title !== undefined) update.title = body.title || 'Untitled event'
    if (body.description !== undefined) update.description = body.description || ''
    if (body.type !== undefined) update.type = body.type as EventRow['type']
    if (body.timestamp !== undefined) update.primary_timestamp = body.timestamp
    if (body.timestampPrecision !== undefined && body.timestampPrecision !== null) {
      update.timestamp_precision = body.timestampPrecision
    }
    if (body.location !== undefined) update.location = body.location
    if (body.durationMinutes !== undefined) update.duration_minutes = body.durationMinutes
    if (body.childInvolved !== undefined) update.child_involved = body.childInvolved ?? false
    if (body.agreementViolation !== undefined) update.agreement_violation = body.agreementViolation
    if (body.safetyConcern !== undefined) update.safety_concern = body.safetyConcern
    if (body.welfareImpact !== undefined && body.welfareImpact !== null) {
      update.welfare_impact = body.welfareImpact
    }

    if (Object.keys(update).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No updatable fields were provided.'
      })
    }

    update.updated_at = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('events')
      .update(update)
      .eq('id', eventId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Supabase update event error (event detail):', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update event.'
      })
    }
  }

  // Fetch the (possibly updated) event
  const { data: eventRow, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single()

  if (eventError || !eventRow) {
    console.error('Supabase select event error (event detail):', eventError)
    throw createError({
      statusCode: 404,
      statusMessage: 'Event not found.'
    })
  }

  // Fetch all related data in parallel
  const [
    { data: participantsRows, error: participantsError },
    { data: evidenceRows, error: evidenceError },
    { data: evidenceMentionsRows, error: evidenceMentionsError },
    { data: actionItemsRows, error: actionItemsError },
    { data: communicationsRows, error: communicationsError },
    { data: suggestionsRows, error: suggestionsError }
  ] = await Promise.all([
    supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId),
    
    supabase
      .from('event_evidence')
      .select(`
        *,
        evidence (*)
      `)
      .eq('event_id', eventId),
    
    supabase
      .from('evidence_mentions')
      .select('*')
      .eq('event_id', eventId),
    
    supabase
      .from('action_items')
      .select('*')
      .eq('event_id', eventId),
    
    supabase
      .from('communications')
      .select('*')
      .eq('event_id', eventId),
    
    supabase
      .from('event_evidence_suggestions')
      .select('*')
      .eq('event_id', eventId)
  ])

  // Log any errors but don't fail the request
  if (participantsError) console.error('Error fetching participants:', participantsError)
  if (evidenceError) console.error('Error fetching evidence:', evidenceError)
  if (evidenceMentionsError) console.error('Error fetching evidence mentions:', evidenceMentionsError)
  if (actionItemsError) console.error('Error fetching action items:', actionItemsError)
  if (communicationsError) console.error('Error fetching communications:', communicationsError)
  if (suggestionsError) console.error('Error fetching event evidence suggestions:', suggestionsError)

  // Extract participant labels
  const participants = (participantsRows || []).map((p: EventParticipantRow) => p.label)
  
  // Process evidence with details
  const evidenceDetails = (evidenceRows || []).map((row: any) => ({
    evidence_id: row.evidence_id,
    is_primary: row.is_primary,
    source_type: row.evidence?.source_type,
    original_filename: row.evidence?.original_filename,
    summary: row.evidence?.summary,
    tags: row.evidence?.tags
  }))

  return mapEventToDetailResponse(
    eventRow as EventRow,
    participants,
    evidenceDetails,
    (evidenceMentionsRows || []) as EvidenceMentionRow[],
    (actionItemsRows || []) as ActionItemRow[],
    (communicationsRows || []) as CommunicationRow[],
    (suggestionsRows || []) as EventEvidenceSuggestionRow[]
  )
})
