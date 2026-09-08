import { useMemo, useState } from 'react'
import { Card, CardTitle, Notice, Spinner } from '../components/ui'
import { VARIABLES, variableById, todayIndex } from '../core/ensemble'
import { MODELS } from '../core/models'

/**
 * The roster: which of the sixteen models actually answered here, how far each
 * one reaches, and where each sits relative to the middle.
 *
 * This screen exists because the chart deliberately anonymises the models, and
 * anonymity is only acceptable if the names are one tap away. It is also the
 * table view that the palette's contrast rules require: every value on the
 * charts is available here as text.
 */
export function ModelsScreen({ data, loading, error, pinned, onPin }) {
  const [variableId, setVariableId] = useState(VARIABLES[0].id)
  const variable = variableById(variableId)
  const series = data?.series?.[variableId] ?? null
  const todayIdx = useMemo(() => (data ? todayIndex(data.dayKeys) : 0), [data])

  const rows = useMemo(() => {
    if (!series) return []
    const median = series.stats[todayIdx]?.median ?? null
    return series.members
      .map((m) => {
        const value = m.values[todayIdx]
        // How far ahead this model actually returned data, counted rather than
        // taken from documentation — the two disagree often enough to matter.
        const last = m.values.findLastIndex((v) => v != null)
        return {
          ...m,
          value,
          reachDays: last < 0 ? 0 : Math.max(0, last - todayIdx),
          offset: value != null && median != null ? value - median : null,
        }
      })
      .sort((a, b) => b.reachDays - a.reachDays)
  }, [series, todayIdx])

  if (loading && !data) return <Spinner label="Asking every model…" />
  if (!data || !series) {
    return (
      <div className="p-4">
        <Notice title="No model data yet" tone="critical">
          {error ?? 'Choose a place first.'}
        </Notice>
      </div>
    )
  }

  const collapsed = series.members.filter((m) => m.duplicates.length)

  return (
    <div className="p-4 flex flex-col gap-4">
      <div role="group" aria-label="Choose what to compare" className="grid grid-cols-3 gap-2">
        {VARIABLES.map((v) => {
          const on = v.id === variableId
          return (
            <button
              key={v.id} type="button" onClick={() => setVariableId(v.id)} aria-pressed={on}
              className={`min-h-[3.4rem] px-2 rounded-xl border-2 text-base font-bold leading-tight
                ${on ? 'bg-brand text-brand-ink border-brand' : 'bg-surface text-ink border-line'}`}
            >
              {v.short}
            </button>
          )
        })}
      </div>

      <Card>
        <CardTitle hint={`Values are for today. Tap to draw one on the chart.`}>
          {series.members.length} of {MODELS.length} models answered here
        </CardTitle>

        <ul className="list-none p-0 m-0">
          {rows.map((m, i) => {
            const isPinned = m.id === pinned
            return (
              <li key={m.id} className={i > 0 ? 'border-t border-hairline' : ''}>
                <button
                  type="button"
                  onClick={() => onPin(isPinned ? null : m.id)}
                  aria-pressed={isPinned}
                  className="w-full text-left flex items-start gap-3 py-3.5 min-h-[3.4rem] active:bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className={`shrink-0 mt-1.5 h-4 w-4 rounded-full border-2
                      ${isPinned ? 'bg-pinned border-pinned' : 'bg-transparent border-line'}`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-lg font-bold text-ink leading-tight">
                      {m.label}
                      {isPinned && <span className="text-pinned"> · on chart</span>}
                    </span>
                    <span className="block text-base text-muted">{m.org}</span>
                    <span className="block text-base text-ink-2 mt-0.5">
                      Reaches {m.reachDays} {m.reachDays === 1 ? 'day' : 'days'} ahead
                    </span>
                    {m.duplicates.length > 0 && (
                      <span className="block text-base text-muted mt-0.5">
                        Same numbers as {m.duplicates.map((d) => `${d.label} (${d.org.split(',')[0]})`).join(' and ')}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <span className="block text-xl font-bold text-ink leading-none">
                      {fmt(m.value, variable.kind)}{variable.unit}
                    </span>
                    {m.offset != null && (
                      <span className="block text-base text-muted mt-1">
                        {m.offset === 0 ? 'at middle'
                          : `${m.offset > 0 ? '+' : '−'}${fmt(Math.abs(m.offset), variable.kind)}`}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      {collapsed.length > 0 && (
        <Card>
          <CardTitle>Why some models are counted once</CardTitle>
          <p className="text-lg text-ink-2">
            Outside their own region, the regional models fall back to a global
            one — and several fall back to the <em>same</em> global one, returning
            byte-identical numbers. Counting those separately would manufacture
            agreement that does not exist, so they are folded together here and
            counted once in the spread.
          </p>
          <ul className="list-none p-0 m-0 mt-3">
            {collapsed.map((m) => (
              <li key={m.id} className="text-base text-ink-2 py-1">
                <span className="font-bold text-ink">{m.label}</span>
                {' = '}
                {m.duplicates.map((d) => `${d.label} (${d.org.split(',')[0]})`).join(', ')}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {series.missing.length > 0 && (
        <Card>
          <CardTitle hint="These are regional models, outside their area here">
            {series.missing.length} models returned nothing
          </CardTitle>
          <ul className="list-none p-0 m-0">
            {series.missing.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 py-2 border-t border-hairline first:border-0">
                <span className="text-lg font-bold text-ink">{m.label}</span>
                <span className="text-base text-muted text-right">{m.scope}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function fmt(value, kind) {
  if (value == null) return '—'
  if (kind !== 'rain') return Math.round(value)
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}
