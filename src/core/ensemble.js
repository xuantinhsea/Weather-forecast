/**
 * Fetching every model at once, and turning sixteen disagreeing forecasts into
 * something readable.
 *
 * The whole point of this app is the disagreement. A single forecast line hides
 * the one fact worth knowing before a flood: whether the models are telling the
 * same story. So nothing here averages the models away — it keeps the range,
 * and it is careful about what counts as an independent opinion.
 */
import { MODELS, MODEL_IDS, BEST_MATCH } from './models.js'

const URL = 'https://api.open-meteo.com/v1/forecast'

export const PAST_DAYS = 14
export const FUTURE_DAYS = 16

export const VARIABLES = [
  { id: 'precipitation_sum',   label: 'Rain',              short: 'Rain', unit: ' mm', kind: 'rain' },
  { id: 'temperature_2m_max',  label: 'Daytime high',      short: 'High', unit: '°',  kind: 'temp' },
  { id: 'temperature_2m_min',  label: 'Overnight low',     short: 'Low',  unit: '°',  kind: 'temp' },
]
export const variableById = (id) => VARIABLES.find((v) => v.id === id) ?? VARIABLES[0]

const DAILY = VARIABLES.map((v) => v.id).join(',')

/**
 * Open-Meteo can answer 200 with a body containing bare `nan` tokens, which is
 * not valid JSON — it happens for regional models asked about a point outside
 * their domain. res.json() throws on it, so the body is parsed by hand and a
 * failure is reported as "this model has nothing here" rather than as a crash.
 */
async function getJson(params, signal) {
  let res
  try {
    res = await fetch(`${URL}?${params}`, { signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No internet connection.')
  }
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch { /* handled below */ }

  if (!res.ok) throw new Error(body?.reason || `The weather service returned error ${res.status}.`)
  if (!body) throw new Error('The weather service sent a reply we could not read.')

  // The Date header is attached here rather than read at the call site because
  // offline the service worker replays a stored response: the request succeeds,
  // and Date.now() would report a day-old forecast as "just now". The header
  // travels with the cached copy and is CORS-safelisted, so it stays readable.
  const stamped = Date.parse(res.headers.get('date') ?? '')
  body.__receivedAt = Number.isNaN(stamped) ? Date.now() : stamped
  return body
}

function baseParams(lat, lon) {
  return {
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    past_days: String(PAST_DAYS),
    forecast_days: String(FUTURE_DAYS),
    daily: DAILY,
  }
}

/**
 * One request for the sixteen models, one for Best Match.
 *
 * They cannot be combined: passing best_match alongside other ids makes the API
 * reject the entire call, so a single batch would fail outright.
 */
export async function fetchEnsemble({ lat, lon, signal }) {
  const [batch, best] = await Promise.all([
    getJson(new URLSearchParams({ ...baseParams(lat, lon), models: MODEL_IDS.join(',') }), signal),
    getJson(new URLSearchParams({ ...baseParams(lat, lon), models: BEST_MATCH }), signal).catch(() => null),
  ])

  const days = batch?.daily?.time ?? []
  if (!days.length) throw new Error('No forecast is available for this place.')

  return {
    fetchedAt: responseTime(batch),
    latitude: batch.latitude,
    longitude: batch.longitude,
    timezone: batch.timezone,
    days: days.map(localDate),
    dayKeys: days,
    // One entry per variable, each holding every model's series for it.
    series: Object.fromEntries(VARIABLES.map((v) => [v.id, buildSeries(batch, best, v.id, days.length)])),
  }
}

/** Truthful data age even when a service worker replays a stored response. */
function responseTime(body) {
  return body?.__receivedAt ?? Date.now()
}

function localDate(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Collects each model's series for one variable, drops the models that returned
 * nothing, and collapses the ones that returned *the same thing*.
 *
 * That last step is not tidying. Asked about Hanoi, MET Nordic, KNMI and DMI
 * each return a byte-identical series, because outside their own region they
 * all fall back to the same global model. Counting them as three agreeing
 * forecasts would manufacture confidence that does not exist — which is exactly
 * the error this app is built to prevent.
 */
function buildSeries(batch, best, variable, dayCount) {
  const present = []
  for (const model of MODELS) {
    const values = batch.daily?.[`${variable}_${model.id}`]
    if (!Array.isArray(values)) continue
    if (!values.some((v) => v != null)) continue      // silent all-null: no data here
    present.push({ ...model, values })
  }

  // Group by the exact values returned. Identical series are one opinion.
  const groups = new Map()
  for (const entry of present) {
    const key = entry.values.map((v) => (v == null ? '' : v)).join('|')
    if (groups.has(key)) groups.get(key).push(entry)
    else groups.set(key, [entry])
  }

  const members = [...groups.values()].map((group) => ({
    // The first member names the group; the rest are recorded as aliases so the
    // Models screen can say plainly why they are not listed separately.
    id: group[0].id,
    label: group[0].label,
    org: group[0].org,
    scope: group[0].scope,
    reach: group[0].reach,
    values: group[0].values,
    duplicates: group.slice(1).map((m) => ({ id: m.id, label: m.label, org: m.org })),
  }))

  const bestValues = best?.daily?.[variable] ?? null

  return {
    variable,
    members,
    bestMatch: Array.isArray(bestValues) && bestValues.some((v) => v != null) ? bestValues : null,
    // Models that answered with nothing at all, kept so the app can say so.
    missing: MODELS.filter((m) => {
      const v = batch.daily?.[`${variable}_${m.id}`]
      return !Array.isArray(v) || !v.some((x) => x != null)
    }).map((m) => ({ id: m.id, label: m.label, org: m.org, scope: m.scope })),
    stats: computeStats(members, dayCount),
  }
}

/**
 * Per-day distribution across the surviving models.
 *
 * The band is the full min-max, because with a dozen members the extremes are
 * the decision-relevant part — "one model says 90 mm" is the sentence that
 * matters, and a percentile band would hide it. The inner band is the middle
 * half, which shows where the bulk sits, and the line is the median rather than
 * the mean so one outlier cannot drag it.
 */
function computeStats(members, dayCount) {
  const out = []
  for (let i = 0; i < dayCount; i++) {
    const values = members.map((m) => m.values[i]).filter((v) => v != null && !Number.isNaN(v))
    if (!values.length) {
      out.push({ count: 0, min: null, max: null, median: null, q1: null, q3: null, spread: null })
      continue
    }
    const sorted = [...values].sort((a, b) => a - b)
    out.push({
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: quantile(sorted, 0.5),
      q1: quantile(sorted, 0.25),
      q3: quantile(sorted, 0.75),
      spread: sorted[sorted.length - 1] - sorted[0],
    })
  }
  return out
}

/** Linear-interpolated quantile of an already-sorted array. */
function quantile(sorted, p) {
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** The index of today within the series — the past/future divider. */
export function todayIndex(dayKeys) {
  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const exact = dayKeys.indexOf(key)
  return exact >= 0 ? exact : PAST_DAYS
}

/**
 * How much the models disagree about one day, said in words.
 *
 * The thresholds are absolute rather than proportional. A 30 mm spread means
 * "some models say a dry day and some say a flood" whichever way you scale it,
 * and a reader deciding whether to move equipment needs the absolute number.
 */
const RAIN_BANDS = [
  { max: 2,   label: 'Close agreement', tone: 'good' },
  { max: 10,  label: 'Broad agreement', tone: 'good' },
  { max: 30,  label: 'Some disagreement', tone: 'warning' },
  { max: 60,  label: 'Strong disagreement', tone: 'serious' },
  { max: Infinity, label: 'No agreement at all', tone: 'critical' },
]

const TEMP_BANDS = [
  { max: 1.5, label: 'Close agreement', tone: 'good' },
  { max: 3,   label: 'Broad agreement', tone: 'good' },
  { max: 6,   label: 'Some disagreement', tone: 'warning' },
  { max: 10,  label: 'Strong disagreement', tone: 'serious' },
  { max: Infinity, label: 'No agreement at all', tone: 'critical' },
]

export function describeSpread(spread, kind) {
  if (spread == null) return null
  const bands = kind === 'rain' ? RAIN_BANDS : TEMP_BANDS
  return bands.find((b) => spread < b.max) ?? bands[bands.length - 1]
}

/**
 * The headline: the least agreed-upon day in the week ahead. Picking the worst
 * rather than the average is deliberate — an app for planning around bad
 * weather should surface the day the models cannot settle, not bury it in a
 * mean that looks reassuring.
 */
export function worstDisagreement(series, dayKeys, from, days = 7) {
  let worst = null
  for (let i = from; i < Math.min(from + days, series.stats.length); i++) {
    const s = series.stats[i]
    if (s.spread == null || s.count < 2) continue
    if (!worst || s.spread > worst.spread) worst = { index: i, ...s, day: dayKeys[i] }
  }
  return worst
}

/**
 * A y-axis ceiling that survives outliers.
 *
 * Daily rainfall is violently skewed: at Hanoi in September one model can
 * forecast 330 mm for a single day while the rest sit under 10 mm. Scaling the
 * axis to that peak squashes four readable weeks into the bottom tenth of the
 * chart — the outlier destroys the very comparison the chart exists for.
 *
 * Clipping it away would be worse. "One model predicts 330 mm" is the single
 * most important sentence this app can say to someone with equipment in a
 * floodplain. So the axis is set from a high percentile instead of the maximum,
 * and the days that overshoot are marked at the top of the chart WITH their
 * value, so the outlier is stated rather than either hidden or allowed to
 * flatten everything else.
 */
export function robustCeiling(stats, { percentile = 0.85, headroom = 1.2, floor = 10 } = {}) {
  const tops = stats.map((s) => s.max).filter((v) => v != null).sort((a, b) => a - b)
  if (!tops.length) return floor
  const p = tops[Math.min(tops.length - 1, Math.floor((tops.length - 1) * percentile))]
  // Never cut below the highest median: the central line must always be inside
  // the plot, whatever the outliers are doing.
  const medians = stats.map((s) => s.median).filter((v) => v != null)
  const medianTop = medians.length ? Math.max(...medians) : 0
  return Math.max(p * headroom, medianTop * 1.15, floor)
}
