import { useMemo } from 'react'
import { NowCard } from '../components/NowCard'
import { Card, CardTitle, Spinner, Notice, Button } from '../components/ui'
import { RainChart } from '../components/charts/RainChart'
import { TempChart } from '../components/charts/TempChart'
import { upcomingHours } from '../core/openMeteo'
import { groupIntoBlocks } from '../core/aggregate'
import { hourLabel, timeAgo } from '../core/plainLanguage'
import { useNow } from '../hooks/useNow'
import { formatRain } from '../core/units'

/**
 * Today: the headline, then the next 24 hours as two separate charts.
 *
 * Rain and temperature are never plotted together. Two measures on one plot
 * need two y-scales, and the alignment between them is arbitrary — it invents a
 * relationship the data does not contain. Two charts, one axis each.
 */
export function TodayScreen({ forecast, loading, error, system, onRetry }) {
  const now = useNow()
  const blocks = useMemo(() => {
    if (!forecast) return []
    return groupIntoBlocks(upcomingHours(forecast, 24)).map((b) => ({
      ...b,
      // The start hour on the axis; the full span only in the tooltip, where
      // there is room for it.
      label: hourLabel(b.start),
      longLabel: `${hourLabel(b.start)} to ${hourLabel(new Date(b.end.getTime() + 3600000))}`,
    }))
  }, [forecast])

  if (loading && !forecast) return <Spinner />

  if (!forecast) {
    return (
      <div className="p-4">
        <Notice
          title="We could not get the forecast"
          tone="critical"
          action={<Button variant="primary" onClick={onRetry}>Try again</Button>}
        >
          {error ?? 'Something went wrong. Please try again.'}
        </Notice>
      </div>
    )
  }

  const today = forecast.days[0]
  const rainNext24 = blocks.reduce((sum, b) => sum + (b.rain ?? 0), 0)

  return (
    <div className="p-4 flex flex-col gap-4">
      <NowCard current={forecast.current} today={today} system={system} />

      <Card>
        <CardTitle hint={
          rainNext24 > 0.2
            ? `About ${formatRain(rainNext24, system)} ${system.rainSymbol} altogether`
            : 'Nothing expected in the next day'
        }>
          Rain over the next 24 hours
        </CardTitle>
        <RainChart
          points={blocks}
          system={system}
          emptyNote="No rain expected"
          floor={4}
        />
        <p className="text-base text-muted mt-2">
          Each bar covers six hours, starting at the time shown. Tap a bar for the details.
        </p>
      </Card>

      <Card>
        <CardTitle hint="The highest and lowest are marked">
          Temperature over the next 24 hours
        </CardTitle>
        <TempChart points={blocks} system={system} />
      </Card>

      <p className="text-base text-muted text-center pb-2">
        {timeAgo(forecast.fetchedAt, now)} · Weather data by Open-Meteo
      </p>
    </div>
  )
}
