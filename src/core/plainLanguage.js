/**
 * Dates and durations, said the way a person says them.
 *
 * The wording that turns *numbers* into judgements lives in `ensemble.js`,
 * beside the thresholds it depends on. What is left here is only the calendar.
 */

/**
 * Names a day the way a person would: today, tomorrow, then the weekday. Never
 * a bare date — "Thu 12" makes the reader do arithmetic to find out if that is
 * soon.
 */
export function dayName(date, today = new Date()) {
  const d = new Date(date)
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(d) - startOf(today)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { weekday: 'long' })
}

/** "Mon" — the three-letter form for a chart axis, where "Today" will not fit
 *  and a truncated one reads as a typo. */
export function shortDayName(date) {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'short' })
}

/** "Monday 12 May" — the supporting line under the day name. */
export function dayDate(date) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
}

/** "2 PM" rather than "14:00" — respects the reader's locale clock. */
export function hourLabel(date) {
  return new Date(date).toLocaleTimeString(undefined, { hour: 'numeric' })
}

/** "Updated 5 minutes ago", for the freshness line under a cached forecast. */
export function timeAgo(timestamp, now = Date.now()) {
  if (!timestamp) return null
  const mins = Math.round((now - timestamp) / 60000)
  if (mins < 1) return 'Updated just now'
  if (mins === 1) return 'Updated 1 minute ago'
  if (mins < 60) return `Updated ${mins} minutes ago`
  const hrs = Math.round(mins / 60)
  if (hrs === 1) return 'Updated 1 hour ago'
  if (hrs < 24) return `Updated ${hrs} hours ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'Updated yesterday' : `Updated ${days} days ago`
}
