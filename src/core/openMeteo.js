/**
 * Open-Meteo forecast access. Framework-free on purpose — nothing in this
 * directory imports React, so the same logic can move to a native shell later.
 *
 * Scope is deliberately narrow: temperature and rain. Every extra variable is
 * another row a reader has to skip past to find the two that matter.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

// Always requested in metric; units.js converts at display time.
const CURRENT = ['temperature_2m', 'apparent_temperature', 'precipitation', 'weather_code', 'is_day']
const HOURLY = ['temperature_2m', 'precipitation', 'precipitation_probability', 'weather_code']
const DAILY = ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'precipitation_probability_max', 'weather_code']

export const FORECAST_DAYS = 7

/**
 * Open-Meteo answers 200 with an all-null series when a model has no data for
 * the point rather than failing, so a successful fetch is not the same as
 * usable data. Anything that reaches the UI has been through this check.
 */
function hasAnyValue(arr) {
  return Array.isArray(arr) && arr.some((v) => v != null && !Number.isNaN(v))
}

export async function fetchForecast({ lat, lon, days = FORECAST_DAYS, signal }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: String(days),
    current: CURRENT.join(','),
    hourly: HOURLY.join(','),
    daily: DAILY.join(','),
  })

  let res
  try {
    res = await fetch(`${FORECAST_URL}?${params}`, { signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No internet connection. Showing the last forecast we saved.')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.reason || `The weather service is not answering (error ${res.status}).`)
  }

  const raw = await res.json()
  if (!hasAnyValue(raw?.daily?.temperature_2m_max) && !hasAnyValue(raw?.daily?.precipitation_sum)) {
    throw new Error('No forecast is available for this spot. Try a point a little further inland.')
  }
  return normalize(raw)
}

/**
 * Flattens the API's parallel-arrays shape into the row-per-hour and
 * row-per-day lists the screens actually render. Doing it once here keeps the
 * index-juggling out of every component.
 */
function normalize(raw) {
  const hours = (raw.hourly?.time ?? []).map((time, i) => ({
    time,
    date: new Date(time),
    temperature: raw.hourly.temperature_2m?.[i] ?? null,
    rain: raw.hourly.precipitation?.[i] ?? null,
    rainChance: raw.hourly.precipitation_probability?.[i] ?? null,
    code: raw.hourly.weather_code?.[i] ?? null,
  }))

  const days = (raw.daily?.time ?? []).map((time, i) => ({
    time,
    // Date-only strings parse as UTC midnight, which lands on the previous day
    // for anyone west of Greenwich. Split and build a local date instead.
    date: localDate(time),
    tempMax: raw.daily.temperature_2m_max?.[i] ?? null,
    tempMin: raw.daily.temperature_2m_min?.[i] ?? null,
    rain: raw.daily.precipitation_sum?.[i] ?? null,
    rainChance: raw.daily.precipitation_probability_max?.[i] ?? null,
    code: raw.daily.weather_code?.[i] ?? null,
  }))

  return {
    fetchedAt: Date.now(),
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevation: raw.elevation,
    timezone: raw.timezone,
    current: {
      time: raw.current?.time ?? null,
      temperature: raw.current?.temperature_2m ?? null,
      feelsLike: raw.current?.apparent_temperature ?? null,
      rain: raw.current?.precipitation ?? null,
      code: raw.current?.weather_code ?? null,
      isDay: raw.current?.is_day === 1,
    },
    hours,
    days,
  }
}

function localDate(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The next `count` hours from now — the only slice the Today screen charts. */
export function upcomingHours(forecast, count = 24, now = Date.now()) {
  if (!forecast?.hours?.length) return []
  // Start from the hour we are currently inside, not the next one, so the chart
  // does not open with the reader's own hour already missing.
  const start = forecast.hours.findIndex((h) => h.date.getTime() + 3600000 > now)
  return forecast.hours.slice(start < 0 ? 0 : start, (start < 0 ? 0 : start) + count)
}

/** Total rain across a set of hours, ignoring gaps. */
export function sumRain(hours) {
  const values = hours.map((h) => h.rain).filter((v) => v != null)
  return values.length ? values.reduce((a, b) => a + b, 0) : null
}
