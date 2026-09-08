import { useMemo } from 'react'
import { ToneBadge } from './ui'
import { describeSpread } from '../core/ensemble'

/**
 * One day, every model.
 *
 * The chart above shows the shape of the disagreement over a month; this
 * answers the next question, which is always "disagreeing about what, exactly".
 *
 * It is a dot strip rather than a bar chart because the reading is about
 * *clustering*: eleven models bunched at 5 mm with one outlier at 64 mm is a
 * completely different situation from twelve spread evenly across that range,
 * and only position-on-a-shared-scale shows that at a glance. Dots that would
 * overlap are stacked upward, so a cluster reads as a tower.
 *
 * The list underneath carries every exact number. That is deliberate: the strip
 * is the shape, the list is the data, and no value is ever available only as a
 * coloured position.
 */
export function DaySpread({ series, index, unit, kind, pinned, onPin }) {
  const stat = series.stats[index]

  const rows = useMemo(() => {
    return series.members
      .map((m) => ({ ...m, value: m.values[index] }))
      .filter((m) => m.value != null)
      .sort((a, b) => a.value - b.value)
  }, [series.members, index])

  if (!stat || !stat.count) {
    return (
      <p className="text-lg text-ink-2">
        No model reaches this far ahead. The longest-range models here stop
        around sixteen days out.
      </p>
    )
  }

  const band = describeSpread(stat.spread, kind)
  const best = series.bestMatch?.[index] ?? null

  return (
    <div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <p className="text-2xl font-bold text-ink">
          {fmt(stat.min, kind)} to {fmt(stat.max, kind)}{unit}
        </p>
        <ToneBadge tone={band?.tone ?? 'calm'}>{band?.label}</ToneBadge>
      </div>
      <p className="text-base text-muted mt-1">
        {stat.count === 1 ? '1 model reaches this day' : `${stat.count} models reach this day`}
        {' · middle model '}{fmt(stat.median, kind)}{unit}
      </p>

      <DotStrip rows={rows} stat={stat} kind={kind} best={best} pinned={pinned} />

      <ul className="list-none p-0 m-0 mt-4">
        {rows.map((m, i) => {
          const isPinned = m.id === pinned
          return (
            <li key={m.id} className={i > 0 ? 'border-t border-hairline' : ''}>
              <button
                type="button"
                onClick={() => onPin(isPinned ? null : m.id)}
                aria-pressed={isPinned}
                className="w-full text-left flex items-center gap-3 py-3 min-h-[3.4rem] active:bg-sunken"
              >
                <span
                  aria-hidden="true"
                  className={`shrink-0 h-4 w-4 rounded-full border-2
                    ${isPinned ? 'bg-pinned border-pinned' : 'bg-transparent border-line'}`}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-lg font-bold text-ink leading-tight">
                    {m.label}
                    {isPinned && <span className="text-pinned"> · shown on chart</span>}
                  </span>
                  <span className="block text-base text-muted truncate">{m.org}</span>
                </span>
                <span
                  className="shrink-0 text-xl font-bold text-ink"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmt(m.value, kind)}{unit}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * The dots.
 *
 * Positioned HTML rather than SVG: a viewBox stretched to the container width
 * scales x and y unequally, which turned every dot into an ellipse. Percentage
 * offsets with fixed-size elements keep them round at any width, and they
 * inherit the rem sizing so they grow with the text-size control.
 */
function DotStrip({ rows, stat, kind, best, pinned }) {
  const lo = stat.min
  const hi = stat.max
  const span = hi - lo || 1
  const pct = (v) => ((v - lo) / span) * 100

  // Stack any dot that would overlap the one before it, so a cluster reads as
  // a tower rather than a single blob. Rows arrive sorted, so one pass does it.
  const MIN_GAP = 4.2            // percent of the strip width
  const placed = []
  let lastPct = -Infinity
  let level = 0
  for (const row of rows) {
    const x = pct(row.value)
    level = x - lastPct < MIN_GAP ? level + 1 : 0
    lastPct = x
    placed.push({ ...row, x, level })
  }
  const levels = Math.max(...placed.map((p) => p.level), 0)

  const marker = (value, color, dashed) => {
    if (value == null || value < lo || value > hi) return null
    return (
      <span
        aria-hidden="true"
        className="absolute bottom-0 w-0.5 h-4 -translate-x-1/2"
        style={{
          left: `${pct(value)}%`,
          background: dashed
            ? `repeating-linear-gradient(${color} 0 3px, transparent 3px 6px)`
            : color,
        }}
      />
    )
  }

  return (
    <div className="mt-4">
      <div
        className="relative mx-2"
        style={{ height: `${1.3 + levels * 0.72}rem` }}
        role="img"
        aria-label={`${rows.length} models, from ${fmt(lo, kind)} to ${fmt(hi, kind)}`}
      >
        <span aria-hidden="true" className="absolute bottom-1.5 inset-x-0 h-px bg-line" />
        {marker(stat.median, 'var(--color-median)', false)}
        {marker(best, 'var(--color-best)', true)}
        {placed.map((p) => (
          <span
            key={p.id}
            aria-hidden="true"
            className="absolute h-3 w-3 rounded-full -translate-x-1/2 ring-2 ring-surface"
            style={{
              left: `${p.x}%`,
              bottom: `${0.55 + p.level * 0.72}rem`,
              background: p.id === pinned ? 'var(--color-pinned)' : 'var(--color-ink-2)',
            }}
          />
        ))}
      </div>
      <div
        className="flex justify-between text-base text-muted mt-1"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span>{fmt(lo, kind)}</span>
        <span>{fmt(hi, kind)}</span>
      </div>
    </div>
  )
}

function fmt(value, kind) {
  if (value == null) return '—'
  if (kind !== 'rain') return Math.round(value)
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}
