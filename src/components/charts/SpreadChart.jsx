import { useCallback, useMemo, useRef } from 'react'
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
/**
 * The same component draws the thirty-day and the twenty-four-hour view: the
 * encoding is identical, only the axis and the rule's name change. `points` are
 * the Dates behind each column, `markerIndex` is where the vertical rule goes
 * and `markerLabel` is what it is called there — "today" on the month, "now" on
 * the day.
 */
export function SpreadChart({
  series, points, markerIndex, markerLabel = 'today',
  tickFormat, fullFormat, unit, kind,
  pinned, selectedIndex, onSelectDay, height = '17rem', maxTicks = 5,
  // Below this, the rain axis stops shrinking. Daily totals and hourly rates
  // live two orders of magnitude apart, so they cannot share one floor.
  rainFloor = 10,
}) {
  const theme = useChartTheme()
  const chartRef = useRef(null)
  const stats = series.stats

  /**
   * Tap-to-select, handled on the wrapper rather than through Chart.js's own
   * `onClick`.
   *
   * Chart.js only fires that callback for clicks it considers inside the plot
   * area, so every tap landing in the axis gutter — a good third of the width
   * of a phone-sized chart — was silently doing nothing. Listening on the
   * wrapper catches all of them, and clamping the pixel into the plot area
   * before converting means a tap near an edge picks the end column, which is
   * what someone aiming at it meant.
   */
  const handleTap = useCallback((event) => {
    const chart = chartRef.current
    if (!chart || !onSelectDay || !points.length) return
    const rect = chart.canvas.getBoundingClientRect()
    const { left, right } = chart.chartArea
    const x = Math.min(right, Math.max(left, event.clientX - rect.left))
    const raw = chart.scales.x.getValueForPixel(x)
    if (!Number.isFinite(raw)) return
    onSelectDay(Math.min(points.length - 1, Math.max(0, Math.round(raw))))
  }, [onSelectDay, points.length])

  const labels = useMemo(() => points.map(tickFormat), [points, tickFormat])

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

    // Rain is an amount, so its axis starts at zero — and its ceiling comes
    // from a percentile rather than the maximum, because a single 330 mm
    // outlier would otherwise flatten four readable weeks into nothing. The
    // columns that overshoot are marked explicitly instead (see spreadMarks).
    // Temperature is a level and is not skewed like this, so it tracks the data.
    const bounds = kind === 'rain'
      ? { min: 0, max: niceBounds(0, robustCeiling(stats, { floor: rainFloor })).max }
      : niceBounds(lo - 1, hi + 1)

    const xAxis = axes(theme, {}).x

    return {
      ...base,
      scales: {
        ...axes(theme, { ...bounds, unit }),
        x: {
          ...xAxis,
          // Thirty labels never fit on a phone; about one a week is the useful
          // density, and the tooltip names the exact day.
          ticks: { ...xAxis.ticks, autoSkip: true, maxTicksLimit: maxTicks },
        },
      },
      // The index is read off the x scale rather than by hit-testing elements.
      // Every dataset here draws with pointRadius and pointHitRadius of zero —
      // the marks are a band and three lines, not points — so there is nothing
      // for getElementsAtEventForMode to find, and taps were silently doing
      // nothing. Asking the axis which column a pixel falls in always works,
      // and it means a tap anywhere in the column counts, not just on the line.
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          // The four band edges are scaffolding, not readings.
          filter: (item) => ['median', 'best', 'pinned'].includes(item.dataset.label),
          callbacks: {
            title: (items) => fullFormat(points[items[0].dataIndex]),
            beforeBody: (items) => {
              const s = stats[items[0].dataIndex]
              if (!s || !s.count) return 'No model reaches this far'
              if (s.count === 1) return 'Only 1 model reaches this far'
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
  }, [theme, stats, points, fullFormat, unit, kind, pinnedMember, maxTicks, rainFloor])

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

      // Columns where at least one model is above the ceiling. Marked with a
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

      if (markerIndex == null || markerIndex < 0) return
      const x = scales.x.getPixelForValue(markerIndex)
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
      ctx.fillText(markerLabel, x + (nearRight ? -px * 0.25 : px * 0.25), chartArea.bottom - px * 0.15)
      ctx.restore()
    },
  }], [theme, markerIndex, markerLabel, selectedIndex, stats, kind])

  return (
    <div style={{ height }} onClick={handleTap}>
      <Line ref={chartRef} data={data} options={options} plugins={plugins} />
    </div>
  )
}

function fmt(value, kind) {
  if (value == null) return '—'
  if (kind !== 'rain') return Math.round(value)
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}
