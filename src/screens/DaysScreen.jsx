import { useMemo } from 'react'
import { Card, CardTitle, Spinner, Notice, Button } from '../components/ui'
import { DayRow } from '../components/DayRow'
import { RainChart } from '../components/charts/RainChart'
import { TempRangeChart } from '../components/charts/TempRangeChart'
import { dayName, dayDate, shortDayName } from '../core/plainLanguage'
import { toRain, formatRain } from '../core/units'

/** The week ahead: the two charts for the shape of it, then the list for the detail. */
export function DaysScreen({ forecast, loading, error, system, onRetry }) {
  const days = useMemo(() => {
    if (!forecast) return []
    return forecast.days.map((d) => ({
      ...d,
      // Three letters fit under a bar on the narrowest phone; the tooltip and
      // the list below both spell the day out in full.
      shortLabel: shortDayName(d.date),
      longLabel: `${dayName(d.date)}, ${dayDate(d.date)}`,
      label: shortDayName(d.date),
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

  const maxRain = Math.max(...days.map((d) => toRain(d.rain, system) ?? 0), 0)
  const wettest = days.reduce((a, b) => ((b.rain ?? 0) > (a?.rain ?? -1) ? b : a), null)

  return (
    <div className="p-4 flex flex-col gap-4">
      <Card>
        <CardTitle hint={
          maxRain > 0.2
            ? `${dayName(wettest.date)} is the wettest, about ${formatRain(wettest.rain, system)} ${system.rainSymbol}`
            : 'A dry week ahead'
        }>
          Rain each day
        </CardTitle>
        <RainChart points={days} system={system} emptyNote="No rain expected this week" />
      </Card>

      <Card>
        <CardTitle hint="Each bar runs from the coolest to the warmest part of the day">
          Temperature each day
        </CardTitle>
        <TempRangeChart days={days} system={system} />
      </Card>

      <Card>
        <CardTitle>Day by day</CardTitle>
        <ul className="list-none p-0 m-0">
          {days.map((day, i) => (
            <DayRow
              key={day.time}
              day={day}
              system={system}
              maxRain={maxRain}
              isFirst={i === 0}
            />
          ))}
        </ul>
      </Card>

      <p className="text-base text-muted text-center pb-2">
        Weather data by Open-Meteo
      </p>
    </div>
  )
}
