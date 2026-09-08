import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { baseOptions, axes, niceBounds } from './chartBase'
import { robustCeiling } from '../../core/ensemble'
import { useChartTheme } from '../../hooks/useChartTheme'

/**
 * Thirty days of every model at once: fourteen behind, sixteen ahead.
 *
 * The encoding is deliberately not sixteen coloured lines. Past about eight
 * hues nothing is distinguishable, and a tangle of lines answers no question
 * anyway. What a reader needs is the shape of the disagreement, so the models
 * are drawn as a grey range — the full min-to-max, with the middle half darker
 * — and hue is spent only on the things that have names: the middle model,
 * Open-Meteo's own Best Match pick, and whichever single model the reader has
 * pinned from the Models screen.
 *
 * The full min-max is shown rather than a tidier percentile band because the
 * extremes are the decision-relevant part. "One model says 90 mm" is exactly
 * the sentence someone moving equipment out of a floodplain needs to see, and
 * a 10-90 band is designed to hide it.
 */
export function SpreadChart({
  series, days, todayIdx, unit, kind,
  pinned, selectedIndex, onSelectDay, height = '17rem',
}) {
  const theme = useChartTheme()
  const stats = series.stats

  const labels = useMemo(
    () => days.map((d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })),
    [days],
  )

  const pinnedMember = pinned ? series.members.find((m) => m.id === pinned) : null

  const data = useMemo(() => {
    const px = theme.rootPx

    // A band edge: invisible stroke, the fill does the work. 'fill: +1' ties
    // this edge to the one drawn next, which is its opposite bound.
    const edge = (values, color, fill) => ({
      data: values,
      borderColor: 'transparent',
      backgroundColor: color,
      borderWidth: 0,
      pointRadius: 0,
      pointHitRadius: 0,
      tension: 0.25,
      fill,
      order: 5,
    })

    const line = (values, color, width, extra) => ({
      data: values,
      borderColor: color,
      backgroundColor: color,
      borderWidth: width,
      pointRadius: 0,
      pointHitRadius: 0,
      tension: 0.25,
      fill: false,
      order: 1,
      ...extra,
    })

    return {
      labels,
      datasets: [
        edge(stats.map((s) => s.max), theme.band, '+1'),
        edge(stats.map((s) => s.min), theme.band, false),
        edge(stats.map((s) => s.q3), theme.bandInner, '+1'),
        edge(stats.map((s) => s.q1), theme.bandInner, false),
        line(stats.map((s) => s.median), theme.median, px * 0.17, { label: 'median' }),
        // Best Match is dashed as well as coloured, so it stays separable from
        // the middle model in bright sun and for a colourblind reader.
        line(series.bestMatch ?? [], theme.best, series.bestMatch ? px * 0.17 : 0, {
          label: 'best',
          borderDash: [px * 0.42, px * 0.3],
        }),
        line(pinnedMember ? pinnedMember.values : [], theme.pinned, pinnedMember ? px * 0.2 : 0, {
          label: 'pinned',
        }),
      ],
    }
  }, [labels, stats, series.bestMatch, pinnedMember, theme])

  const options = useMemo(() => {
    const base = baseOptions(theme)
    const all = stats.flatMap((s) => [s.min, s.max]).filter((v) => v != null)
    const lo = all.length ? Math.min(...all) : 0
    const hi = all.length ? Math.max(...all) : 1
    const step = kind === 'rain' ? 10 : 5

    // Rain is an amount, so its axis starts at zero — and its ceiling comes
    // from a percentile rather than the maximum, because a single 330 mm
    // outlier would otherwise flatten four readable weeks into nothing. The
    // days that overshoot are marked explicitly instead (see spreadMarks).
    // Temperature is a level and is not skewed like this, so it tracks the data.
    const bounds = kind === 'rain'
      ? { min: 0, max: Math.max(niceBounds(0, robustCeiling(stats), step).max, step) }
      : niceBounds(lo - 1, hi + 1, step)

    const xAxis = axes(theme, {}).x

    return {
      ...base,
      scales: {
        ...axes(theme, { ...bounds, unit }),
        x: {
          ...xAxis,
          // Thirty labels never fit on a phone; about one a week is the useful
          // density, and the tooltip names the exact day.
          ticks: { ...xAxis.ticks, autoSkip: true, maxTicksLimit: 5 },
        },
      },
      onClick: (evt, _elements, chart) => {
        if (!onSelectDay) return
        const hit = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true)
        if (hit.length) onSelectDay(hit[0].index)
      },
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          // The four band edges are scaffolding, not readings.
          filter: (item) => ['median', 'best', 'pinned'].includes(item.dataset.label),
          callbacks: {
            title: (items) => days[items[0].dataIndex]?.toLocaleDateString(
              undefined, { weekday: 'long', day: 'numeric', month: 'long' }) ?? '',
            beforeBody: (items) => {
              const s = stats[items[0].dataIndex]
              if (!s || !s.count) return 'No model reaches this day'
              if (s.count === 1) return 'Only 1 model reaches this day'
              return `${s.count} models: ${fmt(s.min, kind)} to ${fmt(s.max, kind)}${unit}`
            },
            label: (item) => {
              const name = {
                median: 'Middle model',
                best: 'Best Match',
                pinned: pinnedMember?.label,
              }[item.dataset.label]
              if (!name || item.raw == null) return null
              return `${name}: ${fmt(item.raw, kind)}${unit}`
            },
          },
        },
      },
    }
  }, [theme, stats, days, unit, kind, onSelectDay, pinnedMember])

  /**
   * Two marks Chart.js has no concept of: the line between what has already
   * happened and what is only predicted, and the day the reader has tapped.
   */
  const plugins = useMemo(() => [{
    id: 'spreadMarks',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales, data: d } = chart
      if (selectedIndex == null || selectedIndex < 0) return
      const x = scales.x.getPixelForValue(selectedIndex)
      const half = chartArea.width / Math.max(d.labels.length, 1) / 2
      ctx.save()
      ctx.fillStyle = theme.selected
      ctx.fillRect(x - half, chartArea.top, half * 2, chartArea.height)
      ctx.restore()
    },
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart
      const px = theme.rootPx
      const top = scales.y.max

      // Days where at least one model is above the ceiling. Marked with a
      // chevron and its value, so a clipped outlier is stated out loud rather
      // than silently cropped off the top of the plot.
      ctx.save()
      ctx.font = `700 ${px * 0.75}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      stats.forEach((s, i) => {
        if (s.max == null || s.max <= top) return
        const x = scales.x.getPixelForValue(i)
        const y = chartArea.top + px * 0.1
        ctx.fillStyle = theme.ink
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - px * 0.3, y + px * 0.42)
        ctx.lineTo(x + px * 0.3, y + px * 0.42)
        ctx.closePath()
        ctx.fill()
        ctx.fillText(fmt(s.max, kind), x, y + px * 0.5)
      })
      ctx.restore()

      if (todayIdx == null || todayIdx < 0) return
      const x = scales.x.getPixelForValue(todayIdx)
      ctx.save()
      ctx.strokeStyle = theme.ink2
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
      // Written on the chart rather than left to the axis: the reason for
      // showing two weeks of history is the comparison across this line, so it
      // has to be unmissable.
      // Labelled at the bottom, not the top: the top is where the overflow
      // markers live, and the two were landing on each other.
      ctx.font = `700 ${px * 0.8}px system-ui, sans-serif`
      ctx.fillStyle = theme.ink2
      ctx.textBaseline = 'bottom'
      const nearRight = x > chartArea.left + chartArea.width * 0.72
      ctx.textAlign = nearRight ? 'right' : 'left'
      ctx.fillText('today', x + (nearRight ? -px * 0.25 : px * 0.25), chartArea.bottom - px * 0.15)
      ctx.restore()
    },
  }], [theme, todayIdx, selectedIndex, stats, kind])

  return (
    <div style={{ height }}>
      <Line data={data} options={options} plugins={plugins} />
    </div>
  )
}

function fmt(value, kind) {
  if (value == null) return '—'
  if (kind !== 'rain') return Math.round(value)
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}
