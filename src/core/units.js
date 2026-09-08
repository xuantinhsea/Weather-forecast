/**
 * Unit handling.
 *
 * The whole app speaks one of two systems, chosen once and remembered. There is
 * no per-variable unit picker: a reader who has to remember that temperature is
 * in Celsius but rain is in inches has already been failed by the interface.
 *
 * Data is always FETCHED in metric and converted here at display time. That
 * keeps every threshold in `plainLanguage.js` written once, in millimetres and
 * degrees Celsius, instead of being duplicated and drifting per system.
 */

export const SYSTEMS = {
  metric: {
    id: 'metric',
    label: 'Celsius and millimetres',
    short: '°C · mm',
    tempSymbol: '°C',
    rainSymbol: 'mm',
    windSymbol: 'km/h',
  },
  imperial: {
    id: 'imperial',
    label: 'Fahrenheit and inches',
    short: '°F · in',
    tempSymbol: '°F',
    rainSymbol: 'in',
    windSymbol: 'mph',
  },
}

export function getSystem(id) {
  return SYSTEMS[id] ?? SYSTEMS.metric
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** Celsius -> the active system's temperature unit. */
export function toTemp(celsius, system) {
  if (!isNum(celsius)) return null
  return system.id === 'imperial' ? celsius * 9 / 5 + 32 : celsius
}

/** Millimetres -> the active system's depth unit. */
export function toRain(mm, system) {
  if (!isNum(mm)) return null
  return system.id === 'imperial' ? mm / 25.4 : mm
}

/** km/h -> the active system's speed unit. */
export function toWind(kmh, system) {
  if (!isNum(kmh)) return null
  return system.id === 'imperial' ? kmh / 1.609344 : kmh
}

/** Temperatures are always whole numbers — a tenth of a degree is noise here. */
export function formatTemp(celsius, system) {
  const v = toTemp(celsius, system)
  return v == null ? '—' : Math.round(v).toString()
}

/** Rain depths in inches need decimals that millimetres do not. */
export function formatRain(mm, system) {
  const v = toRain(mm, system)
  if (v == null) return '—'
  if (v === 0) return '0'
  if (system.id === 'imperial') return v < 0.1 ? v.toFixed(2) : v.toFixed(1)
  return v < 1 ? v.toFixed(1) : Math.round(v).toString()
}

export function formatWind(kmh, system) {
  const v = toWind(kmh, system)
  return v == null ? '—' : Math.round(v).toString()
}
