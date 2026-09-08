import { useCallback, useEffect, useState } from 'react'
import { fetchEnsemble } from '../core/ensemble'
import { loadCachedForecast, saveCachedForecast } from '../core/storage'

const keyOf = (place) => (place ? `${place.lat},${place.lon}` : null)

/**
 * Fetches every model for a place and keeps the last good answer.
 *
 * The cache is not an optimisation, it is the failure mode. When the network
 * drops — which during the weather this app is for, it will — the app keeps
 * showing the last ensemble with an honest age against it, rather than an error
 * page at the moment it is most needed.
 */
export function useEnsemble(place) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [shownPlace, setShownPlace] = useState(null)
  const [nonce, setNonce] = useState(0)

  // Swap in this place's cached ensemble during render rather than in an
  // effect: reading storage is synchronous, and doing it in an effect would
  // paint the previous place's numbers for a frame first.
  const key = keyOf(place)
  if (key !== shownPlace) {
    setShownPlace(key)
    const cached = place ? loadCachedForecast(place.lat, place.lon) : null
    setData(cached)
    setError(null)
    setLoading(!!place)
  }

  useEffect(() => {
    if (!place) return
    const controller = new AbortController()

    fetchEnsemble({ lat: place.lat, lon: place.lon, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setError(null)
        saveCachedForecast(place.lat, place.lon, result)
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || controller.signal.aborted) return
        // With a cached ensemble on screen this is a freshness problem, not a
        // dead end: keep the data and say plainly that it is old.
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

  useEffect(() => {
    const retry = () => setNonce((n) => n + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])

  const refresh = useCallback(() => {
    if (!place) return
    setLoading(true)
    setError(null)
    setNonce((n) => n + 1)
  }, [place])

  return { data, loading, error, refresh }
}
