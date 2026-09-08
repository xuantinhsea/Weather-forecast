import { useCallback, useEffect, useState } from 'react'

/**
 * Chart.js wants numbers and hex strings, not CSS variables, so the tokens have
 * to be read out of the stylesheet and handed over explicitly.
 *
 * Two things invalidate them: the reader switching light/dark, and the
 * text-size control changing the root font size. Every chart dimension is
 * derived from `rootPx` so the charts grow with the rest of the app — a chart
 * that stays 11px while the labels around it grow to 24px is the failure this
 * hook exists to prevent.
 */
const TOKENS = {
  ink: '--color-ink',
  ink2: '--color-ink-2',
  muted: '--color-muted',
  grid: '--color-hairline',
  axis: '--color-line',
  surface: '--color-surface',
  band: '--color-band',
  bandInner: '--color-band-inner',
  selected: '--color-selected',
  median: '--color-median',
  best: '--color-best',
  pinned: '--color-pinned',
  temp: '--color-temp',
  tempSoft: '--color-temp-soft',
  rain: '--color-rain',
  rainSoft: '--color-rain-soft',
}

function readTheme() {
  const styles = getComputedStyle(document.documentElement)
  const out = { rootPx: parseFloat(styles.fontSize) || 18 }
  for (const [key, prop] of Object.entries(TOKENS)) {
    out[key] = styles.getPropertyValue(prop).trim()
  }
  return out
}

export function useChartTheme() {
  const [theme, setTheme] = useState(readTheme)
  const refresh = useCallback(() => setTheme(readTheme()), [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', refresh)

    // The text-size control writes --text-scale onto <html>; watching the style
    // attribute catches it without the settings hook having to know that charts
    // exist at all.
    const observer = new MutationObserver(refresh)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] })

    return () => {
      media.removeEventListener('change', refresh)
      observer.disconnect()
    }
  }, [refresh])

  return theme
}
