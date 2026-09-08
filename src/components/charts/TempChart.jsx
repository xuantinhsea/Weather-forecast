import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { baseOptions, axes, directLabels, niceBounds } from './chartBase'
import { useChartTheme } from '../../hooks/useChartTheme'
import { extremes } from '../../core/aggregate'
import { formatTemp, toTemp } from '../../core/units'

/**
 * Temperature as a line — a state that varies continuously, so the connection
 * between readings is real and worth drawing.
 *
 * This is a separate chart from the rain, never a second axis on it. Two
 * measures on one plot with two scales invent a correlation that is not in the
 * data, and the alignment of the two axes is arbitrary.
 *
 * Only the day's high and low are labelled — the two numbers a reader is
 * actually looking for.
 */
export function TempChart({ points, system, height = '13rem' }) {
  const theme = useChartTheme()

  const values = points.map((p) => toTemp(p.temperature, system))
  const { hi, lo } = extremes(values)

  const data = useMemo(() => ({
    labels: points.map((p) => p.label),
    datasets: [{
      data: values,
      borderColor: theme.temp,
      // A soft wash under the line gives the eye a shape to follow, without the
      // saturated block that makes a chart read as loud.
      backgroundColor: theme.tempSoft,
      fill: true,
      borderWidth: theme.rootPx * 0.17,        // ~3px at the default size
      tension: 0.35,
      pointBackgroundColor: theme.temp,
      // A 2px surface ring separates a marker from the line it sits on, rather
      // than a border drawn around the mark.
      pointBorderColor: theme.surface,
      pointBorderWidth: theme.rootPx * 0.12,
      pointRadius: theme.rootPx * 0.28,        // ~5px radius = 10px marker
      pointHoverRadius: theme.rootPx * 0.42,
      // The touch target is larger than the mark, so a fingertip that lands
      // near a point still selects it.
      pointHitRadius: theme.rootPx * 1.4,
      spanGaps: true,
    }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [points, theme, system.id])

  const options = useMemo(() => {
    const base = baseOptions(theme)
    const clean = values.filter((v) => v != null)
    // Enough to keep the line off the frame, and enough of a minimum span that
    // a steady day is not rendered as a mountain range built from half a degree.
    // It stays small because niceBounds rounds outward on top of it, and the
    // chart's own layout padding already reserves the room the labels need.
    const min = Math.min(...clean)
    const max = Math.max(...clean)
    const pad = Math.max((max - min) * 0.1, system.id === 'imperial' ? 2 : 1)

    return {
      ...base,
      scales: axes(theme, { ...niceBounds(min - pad, max + pad), unit: '°' }),
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            title: (items) => points[items[0].dataIndex]?.longLabel ?? '',
            label: (item) => `${formatTemp(points[item.dataIndex].temperature, system)}${system.tempSymbol}`,
          },
        },
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, points, system.id])

  const plugins = useMemo(() => [directLabels({
    theme,
    // When the whole series is flat, hi and lo land on the same point; one
    // label is right there.
    indices: hi === lo ? [hi] : [hi, lo],
    format: (_, i) => `${formatTemp(points[i].temperature, system)}°`,
  })].filter(Boolean), [theme, hi, lo, points, system])

  return (
    <div style={{ height }}>
      <Line data={data} options={options} plugins={plugins} />
    </div>
  )
}
