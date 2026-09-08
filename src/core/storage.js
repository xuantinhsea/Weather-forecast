/**
 * Everything the app remembers between visits: the chosen place, the unit
 * system, the text size, and the last forecast we successfully fetched.
 *
 * The cached forecast is the point of the whole module. During a storm the
 * network is the first thing to go, and an app that shows a spinner at exactly
 * that moment is worse than useless. Every read is wrapped because storage
 * throws outright in a locked-down browser rather than returning null.
 */

// The 'wr.' prefix predates the app's rename and stays put on purpose:
// changing it would silently discard the saved place and settings of anyone
// who already has the app installed.
const KEYS = {
  place: 'wr.place',
  settings: 'wr.settings',
  forecast: 'wr.forecast',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Private mode, or the quota is full. The app keeps working; it just
    // forgets. Nothing here is worth interrupting the reader over.
    return false
  }
}

export const loadPlace = () => read(KEYS.place, null)
export const savePlace = (place) => write(KEYS.place, place)

export const DEFAULT_SETTINGS = { units: 'metric', textScale: 1 }
export function loadSettings() {
  const stored = read(KEYS.settings, {})
  return { ...DEFAULT_SETTINGS, ...stored }
}
export const saveSettings = (settings) => write(KEYS.settings, settings)

/** The cache is keyed by rounded coordinates — a forecast fetched for a point
 *  200 m away is the same forecast, but one for the next valley is not. */
const cacheKey = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`

export function loadCachedForecast(lat, lon) {
  const entry = read(KEYS.forecast, null)
  if (!entry || entry.key !== cacheKey(lat, lon)) return null
  const data = entry.data
  if (!Array.isArray(data?.days) || !data.series) return null   // an older shape
  // Dates do not survive JSON, so rebuild the ones the screens rely on.
  return { ...data, days: data.days.map((d) => new Date(d)) }
}

export function saveCachedForecast(lat, lon, data) {
  return write(KEYS.forecast, { key: cacheKey(lat, lon), data })
}
