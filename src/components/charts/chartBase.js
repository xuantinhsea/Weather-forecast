import './setup'

/**
 * Shared chart chrome.
 *
 * Everything is a multiple of `rootPx`, the app's root font size, so the whole
 * chart — tick labels, padding, line weight, tap targets — grows when the
 * reader turns the text size up.
 */
export function baseOptions(theme) {
  const px = theme.rootPx
  return {
    responsive: true,
    maintainAspectRatio: false,
    // Direct labels are drawn just outside the plot area; without room they get
    // clipped by the canvas edge.
    layout: { padding: { top: px * 1.6, right: px * 0.4, left: px * 0.2, bottom: 0 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },   // single series — the card title names it
      tooltip: {
        backgroundColor: theme.ink,
        titleColor: theme.surface,
        bodyColor: theme.surface,
        titleFont: { size: px * 0.95, weight: 700, family: 'system-ui, sans-serif' },
        bodyFont: { size: px * 0.95, family: 'system-ui, sans-serif' },
        padding: px * 0.7,
        cornerRadius: px * 0.5,
        displayColors: false,
        caretSize: px * 0.4,
      },
    },
  }
}

/**
 * Recessive hairline grid, generously sized tick labels.
 *
 * `unit` is appended to each y tick rather than set as an axis title: a title
 * is rendered rotated ninety degrees, which turns "°C" into a shape nobody
 * reads, and asks anyone with a stiff neck to tilt their head at a phone.
 */
export function axes(theme, { unit = '', min, max, suggestedMax, beginAtZero = false } = {}) {
  const px = theme.rootPx
  const tickFont = { size: px * 0.85, weight: 600, family: 'system-ui, sans-serif' }
  return {
    x: {
      grid: { display: false },
      border: { color: theme.axis, width: 1 },
      // These charts are built to hold 7-8 columns, so every one is labelled.
      // Chart.js drops labels by default when they crowd, which on a 7-day
      // chart silently hides four of the seven days.
      ticks: { color: theme.ink2, font: tickFont, padding: px * 0.35, maxRotation: 0, autoSkip: false },
    },
    y: {
      beginAtZero,
      // Hard bounds, not suggested ones: left to expand to its own round
      // numbers Chart.js will pick 10-40 for a series that spans 22-33, and
      // spend half the plot on empty grid.
      min,
      max,
      suggestedMax,
      grid: { color: theme.grid, lineWidth: 1, drawTicks: false },
      border: { display: false },
      ticks: {
        color: theme.muted,
        font: tickFont,
        padding: px * 0.4,
        maxTicksLimit: 5,
        callback: (value) => `${value}${unit}`,
      },
    },
  }
}

/**
 * Draws a value beside selected points only.
 *
 * A number on every point is noise nobody reads; a number on the peak and the
 * trough is the sentence the chart is trying to say. Labels are drawn in ink
 * tokens rather than the series colour — the mark carries identity, the text
 * carries the value.
 */
export function directLabels({ theme, indices, format, color }) {
  return {
    id: 'directLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      const px = theme.rootPx
      ctx.save()
      ctx.font = `700 ${px * 0.95}px system-ui, sans-serif`
      ctx.fillStyle = color ?? theme.ink
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'

      const texts = indices.map((i) => format(chart.data.datasets[0].data[i], i)).filter(Boolean)
      if (texts.length && !labelsFit(ctx, chart, texts, px * 0.5)) {
        ctx.restore()
        return
      }

      for (const i of indices) {
        const point = meta.data[i]
        if (!point) continue
        const text = format(chart.data.datasets[0].data[i], i)
        if (text == null) continue
        ctx.fillText(text, point.x, point.y - px * 0.4)
      }
      ctx.restore()
    },
  }
}

/**
 * True when every label can sit over its own column without touching its
 * neighbour. `texts` must already be in draw order.
 */
export function labelsFit(ctx, chart, texts, gap) {
  const meta = chart.getDatasetMeta(0)
  if (meta.data.length < 2) return true
  // Category width, taken from the actual laid-out marks rather than assumed.
  const columnWidth = Math.abs(meta.data[1].x - meta.data[0].x)
  const widest = Math.max(...texts.map((t) => ctx.measureText(t).width))
  return widest + gap <= columnWidth
}

/**
 * A tick interval of about a quarter of the range, snapped to 1, 2, 2.5 or 5
 * times a power of ten.
 *
 * A fixed step cannot serve both charts: 10 mm is right for daily totals that
 * run to 60, and hopeless for hourly rain where the whole day peaks at 1.5 mm
 * and every value collapses onto the zero line.
 */
export function niceStep(range) {
  if (!(range > 0)) return 1
  const raw = range / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const snapped = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return snapped * mag
}

/** Rounds an axis bound outward to a multiple of `step`, so ticks land on
 *  numbers a reader recognises (20°, 25°, 30°) rather than wherever the data
 *  happened to stop. `step` defaults to one derived from the range itself. */
export function niceBounds(min, max, step) {
  const s = step ?? niceStep(max - min)
  // Multiplying back out reintroduces binary-float noise (0.30000000000000004),
  // which then shows up verbatim in the tick labels.
  const round = (v) => Number((Math.round(v / s) * s).toPrecision(12))
  return {
    min: round(Math.floor(min / s) * s),
    max: round(Math.ceil(max / s) * s),
  }
}
