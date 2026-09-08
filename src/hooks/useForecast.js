import { useCallback, useEffect, useState } from 'react'
import { fetchForecast } from '../core/openMeteo'
import { loadCachedForecast, saveCachedForecast } from '../core/storage'

const keyOf = (place) => (place ? `${place.lat},${place.lon}` : null)

/**
 * Fetches the forecast for a place and keeps the last good answer.
 *
 * The cache is not an optimisation here, it is the failure mode. When the
 * network drops — which during a storm it will — the app keeps showing the last
 * forecast with an honest "this is not fresh" line, instead of an error page at
 * the moment it is most needed.
 */
export function useForecast(place) {
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stale, setStale] = useState(false)
  const [shownPlace, setShownPlace] = useState(null)
  // Bumping this re-runs the fetch effect. Refresh and the back-online retry
  // are the same operation as the initial load, so they share its one code path
  // instead of each carrying a copy.
  const [nonce, setNonce] = useState(0)

  // Switching place swaps in that place's cached forecast immediately, so a
  // slow network shows the last known weather rather than an empty screen.
  // This is the "adjust state when a prop changes" pattern rather than an
  // effect: reading the cache is synchronous, and doing it in an effect would
  // paint the previous place's forecast for a frame first.
  const key = keyOf(place)
  if (key !== shownPlace) {
    setShownPlace(key)
    const cached = place ? loadCachedForecast(place.lat, place.lon) : null
    setForecast(cached)
    setStale(!!cached)
    setError(null)
    setLoading(!!place)
  }

  // A genuine external-system sync, and the only thing this effect does. The
  // request is written inline as an async call rather than behind a helper so
  // it is plain — to a reader and to the linter — that every setState below
  // happens in a promise callback, after the await, and not during render.
  useEffect(() => {
    if (!place) return
    const controller = new AbortController()

    fetchForecast({ lat: place.lat, lon: place.lon, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setForecast(data)
        setStale(false)
        setError(null)
        saveCachedForecast(place.lat, place.lon, data)
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || controller.signal.aborted) return
        // A failure with a cached forecast still on screen is a freshness
        // problem, not a dead end: keep the data, say plainly that it is old.
        setError(err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
    // Coordinates rather than the object: a re-rendered parent hands us a new
    // object for the same place, and that must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.lat, place?.lon, nonce])

  // Coming back online after a failure is the one moment a silent retry is
  // clearly right — the reader already asked for this place.
  useEffect(() => {
    const retry = () => setNonce((n) => n + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])

  /** The Update button. Called from an event handler, so it may show the
   *  spinner straight away — that immediate feedback is the whole point of
   *  pressing it. */
  const refresh = useCallback(() => {
    if (!place) return
    setLoading(true)
    setError(null)
    setNonce((n) => n + 1)
  }, [place])

  return { forecast, loading, error, stale, refresh }
}
