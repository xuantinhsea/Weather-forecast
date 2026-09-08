/**
 * WMO weather codes -> an icon name.
 *
 * Only the distinctions this app makes are kept: whether water is falling out
 * of the sky, and roughly how much. Everything Open-Meteo can report about fog
 * banks and ice pellets collapses into the handful of shapes a reader can tell
 * apart at a glance.
 */
export function iconForCode(code, isDay = true) {
  if (code == null) return 'cloud'
  if (code === 0 || code === 1) return isDay ? 'sun' : 'cloud'
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloud'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code >= 61 && code <= 65) return code >= 65 ? 'heavy' : 'rain'
  if (code >= 66 && code <= 77) return 'rain'
  if (code >= 80 && code <= 82) return code >= 82 ? 'heavy' : 'rain'
  if (code >= 95) return 'heavy'
  return 'cloud'
}
