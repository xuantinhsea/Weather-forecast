/**
 * Numbers -> words.
 *
 * Every band here is written in metric (mm, °C) because that is the unit the
 * data arrives in; `units.js` converts only for display. Wording rules:
 *
 *   - Say the thing, not the measurement. "Heavy rain" first, "45 mm" second.
 *   - No jargon, no abbreviations, no units inside the phrase.
 *   - Advice is an instruction a person can act on, not a hedge.
 *   - Every band carries a `tone` from the fixed status palette, and tone is
 *     NEVER the only signal — the words and the icon say the same thing, so the
 *     app still works for a colourblind reader and in bright sun.
 */

/** Status tones. These four are reserved and never used for decoration. */
export const TONE = {
  calm: 'calm',
  good: 'good',
  warning: 'warning',
  serious: 'serious',
  critical: 'critical',
}

/**
 * Daily rain totals. Boundaries follow the common meteorological day bands
 * (light / moderate / heavy / violent) rounded to numbers a person can hold in
 * their head.
 */
const DAY_RAIN_BANDS = [
  { max: 0.2,  label: 'No rain',         advice: 'A dry day.',                              tone: TONE.calm,     icon: 'sun' },
  { max: 1,    label: 'A few drops',     advice: 'Barely enough to notice.',                tone: TONE.calm,     icon: 'drizzle' },
  { max: 10,   label: 'Light rain',      advice: 'Take an umbrella.',                       tone: TONE.good,     icon: 'drizzle' },
  { max: 35,   label: 'Steady rain',     advice: 'Wear a coat. Roads will be wet.',         tone: TONE.warning,  icon: 'rain' },
  { max: 70,   label: 'Heavy rain',      advice: 'Stay in if you can. Low roads may flood.', tone: TONE.serious, icon: 'heavy' },
  { max: 150,  label: 'Very heavy rain', advice: 'Flooding is likely. Avoid travel.',       tone: TONE.critical, icon: 'heavy' },
  { max: Infinity, label: 'Extreme rain', advice: 'Dangerous. Move to higher ground if you are near a river.', tone: TONE.critical, icon: 'heavy' },
]

/** Hourly rain rates — an hour of rain is a tenth of a day's worth. */
const HOUR_RAIN_BANDS = [
  { max: 0.05, label: 'No rain',    tone: TONE.calm,     icon: 'sun' },
  { max: 0.5,  label: 'Drizzle',    tone: TONE.calm,     icon: 'drizzle' },
  { max: 2.5,  label: 'Light rain', tone: TONE.good,     icon: 'drizzle' },
  { max: 7.5,  label: 'Steady rain', tone: TONE.warning, icon: 'rain' },
  { max: 15,   label: 'Heavy rain', tone: TONE.serious,  icon: 'heavy' },
  { max: Infinity, label: 'Very heavy rain', tone: TONE.critical, icon: 'heavy' },
]

const TEMP_BANDS = [
  { max: 0,   label: 'Freezing', advice: 'Ice is likely. Take care walking.', tone: TONE.serious,  icon: 'cold' },
  { max: 10,  label: 'Cold',     advice: 'Wear a warm coat.',                 tone: TONE.warning,  icon: 'cold' },
  { max: 18,  label: 'Cool',     advice: 'A jacket is enough.',               tone: TONE.calm,     icon: 'mild' },
  { max: 24,  label: 'Mild',     advice: 'Comfortable outside.',              tone: TONE.calm,     icon: 'mild' },
  { max: 30,  label: 'Warm',     advice: 'Drink water through the day.',      tone: TONE.calm,     icon: 'warm' },
  { max: 35,  label: 'Hot',      advice: 'Stay in the shade at midday.',      tone: TONE.warning,  icon: 'warm' },
  { max: 40,  label: 'Very hot', advice: 'Avoid going out in the afternoon.', tone: TONE.serious,  icon: 'hot' },
  { max: Infinity, label: 'Dangerously hot', advice: 'Stay indoors and keep cool.', tone: TONE.critical, icon: 'hot' },
]

function pick(bands, value) {
  if (value == null || Number.isNaN(value)) return null
  return bands.find((b) => value < b.max) ?? bands[bands.length - 1]
}

export const describeDayRain = (mm) => pick(DAY_RAIN_BANDS, mm)
export const describeHourRain = (mm) => pick(HOUR_RAIN_BANDS, mm)
export const describeTemp = (celsius) => pick(TEMP_BANDS, celsius)

/**
 * The one-line headline at the top of the Today screen. Rain leads whenever
 * there is any, because rain is the thing this app exists to warn about;
 * temperature leads only on a dry day.
 */
export function headline({ rainToday, tempMax, tempMin }) {
  const rain = describeDayRain(rainToday)
  const temp = describeTemp(tempMax)
  if (rain && rainToday >= 1) {
    return { title: rain.label, advice: rain.advice, tone: rain.tone, icon: rain.icon }
  }
  if (temp && (tempMax >= 30 || tempMin <= 2)) {
    return { title: temp.label, advice: temp.advice, tone: temp.tone, icon: temp.icon }
  }
  return {
    title: rain && rainToday > 0 ? rain.label : 'Dry',
    advice: temp?.advice ?? 'Nothing unusual today.',
    tone: TONE.calm,
    icon: rain && rainToday > 0 ? rain.icon : (temp?.icon ?? 'sun'),
  }
}

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
