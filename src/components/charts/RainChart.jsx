import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { baseOptions, axes, directLabels } from './chartBase'
import { useChartTheme } from '../../hooks/useChartTheme'
import { formatRain, toRain } from '../../core/units'

/**
 * Rain as bars — the right mark for an accumulation, where the reader is
 * comparing magnitudes against a zero baseline and "none" has to look like
 * nothing at all.
 *
 * Only the wet bars are labelled. Writing "0" above every dry hour is the
 * number-on-every-point anti-pattern, and it buries the two bars that matter.
 */
export function RainChart({ points, system, height = '13rem', emptyNote, floor = 10 }) {
  const theme = useChartTheme()

  const values = points.map((p) => toRain(p.rain, system) ?? 0)
  const anyRain = values.some((v) => v > 0)
  // Left to itself the axis rescales to whatever is in the series, so 0.3 mm
  // draws the same tall bar as 30 mm and a dry day fills the grid with tenths.
  // A floor on the ceiling keeps a trickle looking like a trickle.
  const minCeiling = toRain(floor, system)
  const ceiling = Math.max(...values) < minCeiling ? minCeiling : undefined

  const data = useMemo(() => ({
    labels: points.map((p) => p.label),
    datasets: [{
      data: values,
      backgroundColor: theme.rain,
      // Rounded data-ends anchored to the baseline; the bar keeps its square
      // foot on zero so the magnitude is not visually shortened.
      borderRadius: theme.rootPx * 0.25,
      borderSkipped: 'bottom',
      // A 2px surface gap between neighbours, instead of a stroke around each.
      barPercentage: 0.82,
      categoryPercentage: 0.9,
      maxBarThickness: theme.rootPx * 2.6,
    }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [points, theme, system.id])

  const options = useMemo(() => {
    const base = baseOptions(theme)
    return {
      ...base,
      scales: axes(theme, {
        beginAtZero: true,
        suggestedMax: ceiling,
        unit: ` ${system.rainSymbol}`,
      }),
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            title: (items) => points[items[0].dataIndex]?.longLabel ?? '',
            label: (item) => {
              const p = points[item.dataIndex]
              const depth = `${formatRain(p.rain, system)} ${system.rainSymbol} of rain`
              return p.rainChance != null ? [depth, `${Math.round(p.rainChance)}% chance`] : depth
            },
          },
        },
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, points, system.id, ceiling])

  const labelled = useMemo(
    () => values.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, system.id],
  )

  const plugins = useMemo(() => [directLabels({
    theme,
    indices: labelled,
    format: (_, i) => formatRain(points[i].rain, system),
  })], [theme, labelled, points, system])

  return (
    <div style={{ height }} className="relative">
      <Bar data={data} options={options} plugins={plugins} />
      {!anyRain && emptyNote && (
        // Absence of data is itself the answer, and it deserves words. An empty
        // grid alone reads as "failed to load".
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-lg font-semibold text-ink-2 pointer-events-none">
          {emptyNote}
        </p>
      )}
    </div>
  )
}
