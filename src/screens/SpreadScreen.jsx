import { useMemo, useState } from 'react'
import { Card, CardTitle, Button, Notice, Spinner } from '../components/ui'
import { SpreadChart } from '../components/charts/SpreadChart'
import { DaySpread } from '../components/DaySpread'
import { VARIABLES, variableById, todayIndex, worstDisagreement, describeSpread, robustCeiling } from '../core/ensemble'
import { useNow } from '../hooks/useNow'
import { timeAgo } from '../core/plainLanguage'

/**
 * The main screen: how much the sixteen models disagree, over thirty days.
 *
 * The headline is the *worst* day in the coming week rather than an average.
 * Averaging disagreement away is the one thing this app must not do — a mean
 * that looks reassuring is exactly how a reader ends up unprepared for the day
 * the models could not settle.
 */
export function SpreadScreen({ data, loading, error, onRetry, pinned, onPin }) {
  const [variableId, setVariableId] = useState(VARIABLES[0].id)
  const [selected, setSelected] = useState(null)
  const now = useNow()

  const variable = variableById(variableId)
  const series = data?.series?.[variableId] ?? null
  const todayIdx = useMemo(() => (data ? todayIndex(data.dayKeys) : 0), [data])

  const worst = useMemo(
    () => (series ? worstDisagreement(series, data.dayKeys, todayIdx) : null),
    [series, data, todayIdx],
  )

  if (loading && !data) return <Spinner label="Asking every model…" />

  if (!data || !series) {
    return (
      <div className="p-4">
        <Notice
          title="We could not reach the models"
          tone="critical"
          action={<Button variant="primary" onClick={onRetry}>Try again</Button>}
        >
          {error ?? 'Something went wrong. Please try again.'}
        </Notice>
      </div>
    )
  }

  const dayIndex = selected ?? worst?.index ?? todayIdx
  const worstBand = worst ? describeSpread(worst.spread, variable.kind) : null
  // Days where a model forecasts more than the chart's ceiling. The chart marks
  // each one with its value; this explains what the marks are.
  const clipped = variable.kind === 'rain'
    ? series.stats.filter((s) => s.max != null && s.max > robustCeiling(series.stats)).length
    : 0

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* --- what to look at -------------------------------------------- */}
      <div role="group" aria-label="Choose what to compare" className="grid grid-cols-3 gap-2">
        {VARIABLES.map((v) => {
          const on = v.id === variableId
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => { setVariableId(v.id); setSelected(null) }}
              aria-pressed={on}
              className={`min-h-[3.4rem] px-2 rounded-xl border-2 text-base font-bold leading-tight
                ${on ? 'bg-brand text-brand-ink border-brand' : 'bg-surface text-ink border-line'}`}
            >
              {v.short}
            </button>
          )
        })}
      </div>

      {/* --- the verdict ------------------------------------------------ */}
      <Card>
        <p className="text-base font-semibold text-muted uppercase tracking-wide">
          Least agreed day this week
        </p>
        {worst ? (
          <>
            <p className="text-3xl font-bold text-ink leading-tight mt-1">
              {new Date(worst.day).toLocaleDateString(undefined, { weekday: 'long' })}
            </p>
            <p className="text-xl text-ink-2 mt-1">
              {fmt(worst.min, variable.kind)} to {fmt(worst.max, variable.kind)}{variable.unit}
              {' across '}{worst.count} models
            </p>
            <p className="text-lg text-ink-2 mt-2">
              <span className="font-bold">{worstBand?.label}.</span>{' '}
              {variable.kind === 'rain'
                ? 'A wide range means the models cannot agree how much water is coming — plan for the top of it, not the middle.'
                : 'A wide range means the models cannot agree how warm it will get.'}
            </p>
          </>
        ) : (
          <p className="text-lg text-ink-2 mt-1">Not enough models reach the coming week here.</p>
        )}
      </Card>

      {/* --- the shape of it -------------------------------------------- */}
      <Card>
        <CardTitle hint="Two weeks behind, sixteen days ahead. Tap any day.">
          {variable.label}: where the models sit
        </CardTitle>

        <SpreadChart
          series={series}
          days={data.days}
          todayIdx={todayIdx}
          unit={variable.unit}
          kind={variable.kind}
          pinned={pinned}
          selectedIndex={dayIndex}
          onSelectDay={setSelected}
        />

        <Legend hasBest={!!series.bestMatch} pinnedLabel={
          pinned ? series.members.find((m) => m.id === pinned)?.label : null
        } />

        {clipped > 0 && (
          <p className="text-base text-ink-2 mt-3">
            <span className="font-bold">▲</span> marks {clipped === 1 ? 'a day' : `${clipped} days`} where
            a model forecasts more rain than fits on the chart. The number beside
            the mark is that forecast — tap the day to see which model.
          </p>
        )}
        <p className="text-base text-muted mt-3">
          The band narrows towards the right because models stop at different
          ranges — ARPEGE ends around day six, GFS runs to sixteen.
        </p>
      </Card>

      {/* --- the day in detail ------------------------------------------ */}
      <Card>
        <CardTitle hint="Tap a model to draw it on the chart above">
          {data.days[dayIndex]?.toLocaleDateString(undefined,
            { weekday: 'long', day: 'numeric', month: 'long' })}
        </CardTitle>
        <DaySpread
          series={series}
          index={dayIndex}
          unit={variable.unit}
          kind={variable.kind}
          pinned={pinned}
          onPin={onPin}
        />
      </Card>

      <p className="text-base text-muted text-center pb-2">
        {timeAgo(data.fetchedAt, now)} · Forecasts by Open-Meteo
      </p>
    </div>
  )
}

/**
 * Identity is never carried by colour alone: every line on the chart is named
 * here, and the two that could be confused also differ in dash pattern.
 */
function Legend({ hasBest, pinnedLabel }) {
  const items = [
    { key: 'band', label: 'All models', swatch: <span className="h-3 w-6 rounded-sm bg-band border border-band-inner" /> },
    { key: 'inner', label: 'Middle half', swatch: <span className="h-3 w-6 rounded-sm bg-band-inner" /> },
    { key: 'median', label: 'Middle model', swatch: <span className="h-1 w-6 rounded-full bg-median" /> },
  ]
  if (hasBest) {
    items.push({
      key: 'best',
      label: 'Best Match',
      swatch: (
        <span className="w-6 flex justify-between" aria-hidden="true">
          <span className="h-1 w-2 rounded-full bg-best" />
          <span className="h-1 w-2 rounded-full bg-best" />
        </span>
      ),
    })
  }
  if (pinnedLabel) {
    items.push({ key: 'pinned', label: pinnedLabel, swatch: <span className="h-1 w-6 rounded-full bg-pinned" /> })
  }

  return (
    <ul className="list-none p-0 m-0 mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          {item.swatch}
          <span className="text-base text-ink-2">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

function fmt(value, kind) {
  if (value == null) return '—'
  if (kind !== 'rain') return Math.round(value)
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}
