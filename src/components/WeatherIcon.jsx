/**
 * The icon set.
 *
 * Every icon is drawn with thick strokes and one clear silhouette. Thin,
 * detailed line icons vanish for a reader with any loss of contrast
 * sensitivity, which is most people past seventy. An icon is never the only
 * thing carrying a meaning — there is always a word beside it.
 */

const STROKE = { fill: 'none', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }

function Sun() {
  return (
    <g>
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
      <g stroke="currentColor" {...STROKE}>
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
      </g>
    </g>
  )
}

function Cloud() {
  return <path d="M7.5 18.5A4.5 4.5 0 0 1 8 9.6a5.6 5.6 0 0 1 10.6 1.7 3.9 3.9 0 0 1-.6 7.2Z" fill="currentColor" />
}

function withDrops(count, long = false) {
  const xs = count === 1 ? [12] : count === 2 ? [9.5, 14.5] : [7.5, 12, 16.5]
  return (
    <g stroke="currentColor" {...STROKE} strokeWidth={long ? 2.6 : 2.2}>
      {xs.map((x) => (
        <path key={x} d={`M${x} 17.4 L${x - 1.2} ${long ? 22.6 : 21.4}`} />
      ))}
    </g>
  )
}

function RainCloud({ drops, long }) {
  return (
    <g>
      <path d="M7.5 15.6A4.3 4.3 0 0 1 8 6.9a5.5 5.5 0 0 1 10.4 1.6 3.8 3.8 0 0 1-.6 7.1Z" fill="currentColor" />
      {withDrops(drops, long)}
    </g>
  )
}

function Thermometer({ level }) {
  // level 0 = empty (cold) through 1 = full (hot); the bulb is always filled so
  // the shape still reads at a glance when the column is short.
  const top = 14.5 - level * 7
  return (
    <g>
      <rect x="9.2" y="2.6" width="5.6" height="13.4" rx="2.8" stroke="currentColor" {...STROKE} />
      <circle cx="12" cy="18.2" r="3.6" fill="currentColor" />
      <rect x="10.7" y={top} width="2.6" height={16.2 - top} rx="1.3" fill="currentColor" />
    </g>
  )
}

const ICONS = {
  sun: Sun,
  cloud: Cloud,
  drizzle: () => <RainCloud drops={2} />,
  rain: () => <RainCloud drops={3} />,
  heavy: () => <RainCloud drops={3} long />,
  cold: () => <Thermometer level={0.12} />,
  mild: () => <Thermometer level={0.45} />,
  warm: () => <Thermometer level={0.72} />,
  hot: () => <Thermometer level={1} />,
}

/**
 * @param name  one of the keys above
 * @param size  a rem string, so icons grow with the text-size control
 */
export function WeatherIcon({ name, size = '2rem', className = '' }) {
  const Shape = ICONS[name] ?? ICONS.cloud
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      <Shape />
    </svg>
  )
}
