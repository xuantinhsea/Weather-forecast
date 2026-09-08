import { useEffect, useState } from 'react'

/**
 * The current time, re-read on an interval.
 *
 * Reading `Date.now()` during render is impure — React may render at any moment
 * and would not know to re-render when the answer changes. It matters here
 * beyond correctness: this app is left open on a windowsill during bad weather,
 * and a forecast that keeps claiming "updated just now" for six hours is
 * actively misleading. A minute is fine granularity for a line that speaks in
 * minutes and hours.
 */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    // Coming back to a backgrounded tab should not wait out the rest of the
    // interval before the age catches up.
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])

  return now
}
