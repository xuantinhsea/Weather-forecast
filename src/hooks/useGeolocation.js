import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeCoords } from '../core/geocode'

// Geolocation is refused outside a secure context. Both deployments are HTTPS
// and localhost counts as secure, so this really guards the case of someone
// serving the built files over plain http on a LAN address.
function available() {
  return typeof navigator !== 'undefined'
    && 'geolocation' in navigator
    && (window.isSecureContext ?? true)
}

/** Browser error codes, said the way a person would say them. */
function explain(err) {
  switch (err?.code) {
    case 1: return 'You have not given this app permission to see your location. You can turn it on in your phone settings, or search for your town instead.'
    case 2: return 'Your phone could not work out where it is. Try again near a window, or search for your town instead.'
    case 3: return 'Finding your location took too long. Please try again.'
    default: return 'We could not find your location. Try searching for your town instead.'
  }
}

/**
 * Wraps the browser geolocation API.
 *
 * `locate()` is the explicit, button-driven request. `autoLocate()` runs only
 * when permission was already granted on an earlier visit — throwing a system
 * permission prompt at someone the instant the app opens is the fastest way to
 * get a permanent "block", and then the button never works again either.
 */
export function useGeolocation(onLocated) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState(null)
  const [supported] = useState(available)

  // Callers rebuild onLocated every render; hold it in a ref so `locate` stays
  // stable and effects don't re-fire on each parent render.
  const cb = useRef(onLocated)
  useEffect(() => { cb.current = onLocated }, [onLocated])

  const request = useCallback((opts = {}) => {
    if (!available()) {
      setError('This browser cannot use your location. Please search for your town instead.')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const c = normalizeCoords(pos.coords.latitude, pos.coords.longitude)
        if (!c) {
          setError('Your phone reported a location we could not read.')
          return
        }
        cb.current?.(c)
      },
      (err) => {
        setLocating(false)
        // A silent auto-locate must never raise a message nobody asked for.
        if (!opts.silent) setError(explain(err))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
    )
  }, [])

  const locate = useCallback(() => request(), [request])

  const autoLocate = useCallback(async () => {
    if (!available() || !navigator.permissions?.query) return
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      if (status.state === 'granted') request({ silent: true })
    } catch {
      // Firefox has historically thrown on this permission name. No silent
      // locate there; the button still works.
    }
  }, [request])

  return { locate, autoLocate, locating, error, supported, clearError: () => setError(null) }
}
