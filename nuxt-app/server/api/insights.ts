import { sub } from 'date-fns'
import type { InsightItem } from '~/types'

const suggestions: string[] = [
  'What happened last Tuesday?',
  'Show me all medical decisions in the last 30 days.',
  'Summarize my involvement this week.',
  'Find contradictions about bedtime agreements.'
]

const recent: InsightItem[] = [{
  id: 1,
  query: 'Summarize incidents related to late school pickups.',
  response: 'There have been 3 documented late school pickups in the last 14 days, all on co-parent days, ranging from 25 to 50 minutes late. School staff noted the child was the last student remaining twice.',
  createdAt: sub(new Date(), { hours: 6 }).toISOString(),
  evidenceIds: [1, 2, 6]
}, {
  id: 2,
  query: 'Show medical-related events involving nighttime coughing.',
  response: 'One pediatrician visit documented recurring nighttime cough and recommended consistent inhaler use and stable bedtime. One incident notes a missed medication dose while at co-parent’s home.',
  createdAt: sub(new Date(), { days: 1 }).toISOString(),
  evidenceIds: [5, 8]
}, {
  id: 3,
  query: 'How consistent has the bedtime routine been this month?',
  response: 'On your nights, bedtime occurred between 8:20 PM and 8:40 PM on school nights with reading and homework completed. Messages show co-parent routinely pushing bedtime past 9:15 PM on their nights.',
  createdAt: sub(new Date(), { days: 2 }).toISOString(),
  evidenceIds: [3, 4]
}]

export default eventHandler(async () => {
  return {
    suggestions,
    recent
  }
})


