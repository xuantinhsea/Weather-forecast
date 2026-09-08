import { useEffect, useState } from 'react'

/** Tracks connectivity so the app can say "you are offline" in as many words
 *  rather than leaving the reader to guess why nothing is updating. */
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine ?? true)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}
