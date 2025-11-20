import { sub } from 'date-fns'
import type { EvidenceItem } from '~/types'

const evidenceItems: EvidenceItem[] = [{
  id: 1,
  sourceType: 'photo',
  originalName: 'school_pickup_timestamp.jpg',
  createdAt: sub(new Date(), { hours: 5 }).toISOString(),
  summary: 'Screenshot of school clock and hallway showing pickup time after dismissal.',
  tags: ['school', 'pickup', 'timing']
}, {
  id: 2,
  sourceType: 'text',
  originalName: 'sms_thread_late_pickup.txt',
  createdAt: sub(new Date(), { hours: 4, minutes: 30 }).toISOString(),
  summary: 'Text exchange where co-parent confirms being stuck in traffic and arriving late.',
  tags: ['communication', 'pickup', 'co-parent']
}, {
  id: 3,
  sourceType: 'text',
  originalName: 'bedtime_schedule_disagreement.txt',
  createdAt: sub(new Date(), { hours: 7 }).toISOString(),
  summary: 'Messages showing disagreement about agreed 8:30 PM bedtime on school nights.',
  tags: ['bedtime', 'routine', 'schedule']
}, {
  id: 4,
  sourceType: 'photo',
  originalName: 'homework_completed_photo.jpg',
  createdAt: sub(new Date(), { days: 1 }).toISOString(),
  summary: 'Photo of completed homework and reading log signed by you.',
  tags: ['positive', 'homework', 'reading']
}, {
  id: 5,
  sourceType: 'document',
  originalName: 'pediatrician_notes_cough.pdf',
  createdAt: sub(new Date(), { days: 2 }).toISOString(),
  summary: 'Doctor notes recommending consistent inhaler use and sleep schedule.',
  tags: ['medical', 'doctor', 'medication']
}, {
  id: 6,
  sourceType: 'email',
  originalName: 'teacher_tardy_report.eml',
  createdAt: sub(new Date(), { days: 3 }).toISOString(),
  summary: 'Email from teacher documenting repeated tardies on co-parent days.',
  tags: ['school', 'tardy', 'teacher']
}, {
  id: 7,
  sourceType: 'email',
  originalName: 'court_hearing_confirmation.eml',
  createdAt: sub(new Date(), { days: 5 }).toISOString(),
  summary: 'Court clerk confirmation of upcoming temporary custody hearing.',
  tags: ['court', 'hearing', 'legal']
}, {
  id: 8,
  sourceType: 'text',
  originalName: 'missed_medication_note.txt',
  createdAt: sub(new Date(), { days: 7 }).toISOString(),
  summary: 'Note written immediately after child reported missing evening medication.',
  tags: ['medical', 'medication', 'incident']
}]

export default eventHandler(async () => {
  return evidenceItems
})


