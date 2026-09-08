import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { baseOptions, axes, niceBounds, labelsFit } from './chartBase'
import { useChartTheme } from '../../hooks/useChartTheme'
import { formatTemp, toTemp } from '../../core/units'

/**
 * Each day's low-to-high span as one floating bar.
 *
 * The obvious alternative — two lines, "highest" and "lowest" — needs a legend
 * and a second colour, and in this app the only other colour already means
 * rain. One bar per day keeps it to a single series in the temperature hue, and
 * the length of the bar says "how much the day swings" directly, which two
 * lines only imply.
 *
 * Both ends are labelled: with seven bars there is room, and the high and the
 * low are exactly what the reader came for.
 */
export function TempRangeChart({ days, system, height = '15rem' }) {
  const theme = useChartTheme()

  const spans = days.map((d) => {
    const lo = toTemp(d.tempMin, system)
    const hi = toTemp(d.tempMax, system)
    return lo == null || hi == null ? null : [lo, hi]
  })

  const data = useMemo(() => ({
    labels: days.map((d) => d.shortLabel),
    datasets: [{
      data: spans,
      backgroundColor: theme.temp,
      borderRadius: theme.rootPx * 0.55,   // rounded at both ends — a capsule
      borderSkipped: false,
      barPercentage: 0.5,
      categoryPercentage: 0.9,
      maxBarThickness: theme.rootPx * 1.5,
    }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [days, theme, system.id])

  const options = useMemo(() => {
    const base = baseOptions(theme)
    const flat = spans.filter(Boolean).flat()
    const pad = Math.max((Math.max(...flat) - Math.min(...flat)) * 0.1, system.id === 'imperial' ? 2 : 1)
    return {
      ...base,
      // Labels sit above and below the capsules, so both margins need room.
      layout: { ...base.layout, padding: { ...base.layout.padding, bottom: theme.rootPx * 0.2 } },
      scales: axes(theme, {
        ...niceBounds(Math.min(...flat) - pad, Math.max(...flat) + pad),
        unit: '°',
      }),
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            title: (items) => days[items[0].dataIndex]?.longLabel ?? '',
            label: (item) => {
              const d = days[item.dataIndex]
              return [
                `Warmest ${formatTemp(d.tempMax, system)}${system.tempSymbol}`,
                `Coolest ${formatTemp(d.tempMin, system)}${system.tempSymbol}`,
              ]
            },
          },
        },
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, days, system.id])

  /** Labels the top and bottom of every capsule. Written inline rather than via
   *  the shared helper because it needs both ends of a floating bar. */
  const plugins = useMemo(() => [{
    id: 'rangeEnds',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      const px = theme.rootPx
      ctx.save()
      ctx.font = `700 ${px * 0.88}px system-ui, sans-serif`
      ctx.textAlign = 'center'

      const texts = days.flatMap((d) => [
        `${formatTemp(d.tempMax, system)}°`,
        `${formatTemp(d.tempMin, system)}°`,
      ])
      if (!labelsFit(ctx, chart, texts, px * 0.5)) {
        ctx.restore()
        return
      }

      days.forEach((d, i) => {
        const bar = meta.data[i]
        if (!bar || !spans[i]) return
        ctx.fillStyle = theme.ink
        ctx.textBaseline = 'bottom'
        ctx.fillText(`${formatTemp(d.tempMax, system)}°`, bar.x, Math.min(bar.y, bar.base) - px * 0.35)
        ctx.fillStyle = theme.ink2
        ctx.textBaseline = 'top'
        ctx.fillText(`${formatTemp(d.tempMin, system)}°`, bar.x, Math.max(bar.y, bar.base) + px * 0.3)
      })
      ctx.restore()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }], [theme, days, system])

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} plugins={plugins} />
    </div>
  )
}
