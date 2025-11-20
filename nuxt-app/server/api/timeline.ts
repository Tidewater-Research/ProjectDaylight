import { sub } from 'date-fns'
import type { TimelineEvent } from '~/types'

const events: TimelineEvent[] = [{
  id: 1,
  timestamp: new Date().toISOString(),
  type: 'incident',
  title: 'Late pickup at school',
  description: 'Co-parent arrived 45 minutes late for school pickup without prior notice. Child waited with school staff.',
  participants: ['You', 'Co-parent', 'School staff'],
  location: 'Jefferson Elementary School',
  evidenceIds: [1, 2]
}, {
  id: 2,
  timestamp: sub(new Date(), { hours: 3 }).toISOString(),
  type: 'communication',
  title: 'Disagreement about bedtime schedule',
  description: 'Text thread where co-parent refuses to follow agreed 8:30 PM bedtime on school nights.',
  participants: ['You', 'Co-parent'],
  evidenceIds: [3]
}, {
  id: 3,
  timestamp: sub(new Date(), { days: 1, hours: 2 }).toISOString(),
  type: 'positive',
  title: 'Homework and reading completed',
  description: 'Documented evening routine including homework, reading, and calming bedtime with child.',
  participants: ['You', 'Child'],
  location: 'Your home',
  evidenceIds: [4]
}, {
  id: 4,
  timestamp: sub(new Date(), { days: 2 }).toISOString(),
  type: 'medical',
  title: 'Pediatrician visit for recurring cough',
  description: 'Doctor notes recommend consistent inhaler use and stable nighttime routine.',
  participants: ['You', 'Child', 'Dr. Patel'],
  location: 'Richmond Pediatrics',
  evidenceIds: [5]
}, {
  id: 5,
  timestamp: sub(new Date(), { days: 3, hours: 4 }).toISOString(),
  type: 'school',
  title: 'Teacher email about tardies',
  description: 'Teacher reports multiple late arrivals on co-parent days over the last two weeks.',
  participants: ['You', 'Teacher', 'Co-parent'],
  location: 'Jefferson Elementary School',
  evidenceIds: [6]
}, {
  id: 6,
  timestamp: sub(new Date(), { days: 5 }).toISOString(),
  type: 'legal',
  title: 'Temporary custody hearing scheduled',
  description: 'Court clerk email confirming hearing date and requesting organized documentation.',
  participants: ['You', 'Attorney', 'Court clerk'],
  evidenceIds: [7]
}, {
  id: 7,
  timestamp: sub(new Date(), { days: 7, hours: 6 }).toISOString(),
  type: 'incident',
  title: 'Missed medication dose',
  description: 'Child reports not receiving prescribed evening medication while at co-parent\'s home.',
  participants: ['You', 'Child'],
  evidenceIds: [8]
}, {
  id: 8,
  timestamp: sub(new Date(), { days: 10 }).toISOString(),
  type: 'positive',
  title: 'Parent-teacher conference summary',
  description: 'Teacher notes improved focus and behavior on weeks with stable routines.',
  participants: ['You', 'Teacher'],
  location: 'Jefferson Elementary School',
  evidenceIds: [6]
}]

export default eventHandler(async () => {
  return events
})


