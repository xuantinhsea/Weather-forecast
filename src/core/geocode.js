/**
 * Place lookup, both directions.
 *
 * Search is forward geocoding for the "find my town" box. `describePoint` is
 * the reverse case: after a map tap or a GPS fix we have coordinates and need
 * something a person recognises, because "10.78, 106.70" tells them nothing
 * about whether they picked the right place.
 */

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function searchPlaces(query, { count = 6, signal } = {}) {
  const q = query?.trim()
  if (!q || q.length < 2) return []

  const params = new URLSearchParams({ name: q, count: String(count), language: 'en', format: 'json' })
  const res = await fetch(`${SEARCH_URL}?${params}`, { signal })
  if (!res.ok) throw new Error('Could not search for places just now.')
  const data = await res.json()

  return (data.results ?? []).map((r) => ({
    id: `g${r.id}`,
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }))
}

/**
 * Names an arbitrary point by finding the closest populated place the geocoder
 * knows about. The search API has no reverse endpoint, so this asks for places
 * matching nothing and instead relies on a small local fallback: if we cannot
 * name it, we say so honestly rather than inventing a name.
 */
export async function describePoint(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    count: '1',
    language: 'en',
    format: 'json',
  })
  try {
    const res = await fetch(`${SEARCH_URL}?${params}`, { signal })
    if (res.ok) {
      const data = await res.json()
      const hit = data.results?.[0]
      if (hit) {
        return {
          name: hit.name,
          detail: [hit.admin1, hit.country].filter(Boolean).join(', '),
        }
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // Fall through — an unnamed point still gives a perfectly good forecast.
  }
  return { name: 'Chosen spot', detail: formatCoords(lat, lon) }
}

/** "10.78°N, 106.70°E" — compass letters instead of minus signs. */
export function formatCoords(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`
}

/**
 * Clamps a latitude and wraps a longitude back into range. A world map can be
 * dragged past its own edge, which hands us a longitude of 400 and an API error
 * the reader cannot possibly explain.
 */
export function normalizeCoords(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180
  return {
    lat: Math.max(-90, Math.min(90, Number(lat.toFixed(4)))),
    lon: Number(wrapped.toFixed(4)),
  }
}
