import { sub } from 'date-fns'
import type { TimelineEvent } from '~/types'

interface HomeSummary {
  todayEvents: number
  incidentsThisWeek: number
  positiveThisWeek: number
  nextCourtDate?: string
  lastCaptureAt?: string
}

interface HomeResponse {
  summary: HomeSummary
  recentEvents: TimelineEvent[]
}

const recentEvents: TimelineEvent[] = [{
  id: 101,
  timestamp: new Date().toISOString(),
  type: 'incident',
  title: 'Late pickup at school',
  description: 'Co-parent arrived 45 minutes late for pickup; child waited with staff.',
  participants: ['You', 'Co-parent', 'School staff'],
  location: 'Jefferson Elementary',
  evidenceIds: [1, 2]
}, {
  id: 102,
  timestamp: sub(new Date(), { hours: 3 }).toISOString(),
  type: 'positive',
  title: 'Calm evening routine',
  description: 'Homework, reading, and lights out by 8:30 PM on a school night.',
  participants: ['You', 'Child'],
  location: 'Your home',
  evidenceIds: [4]
}, {
  id: 103,
  timestamp: sub(new Date(), { days: 1 }).toISOString(),
  type: 'communication',
  title: 'Text about schedule change',
  description: 'Co-parent requested last-minute change to weekend schedule.',
  participants: ['You', 'Co-parent'],
  evidenceIds: [3]
}]

const summary: HomeSummary = {
  todayEvents: 3,
  incidentsThisWeek: 2,
  positiveThisWeek: 5,
  nextCourtDate: sub(new Date(), { days: -10 }).toISOString(),
  lastCaptureAt: sub(new Date(), { minutes: 18 }).toISOString()
}

export default eventHandler(async (): Promise<HomeResponse> => {
  return {
    summary,
    recentEvents
  }
})


