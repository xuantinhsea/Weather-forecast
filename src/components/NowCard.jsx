import { WeatherIcon } from './WeatherIcon'
import { iconForCode } from '../core/weatherCodes'
import { ToneBadge } from './ui'
import { formatTemp, formatRain } from '../core/units'
import { headline } from '../core/plainLanguage'

/**
 * The hero. If a reader looks at one thing and then puts the phone down, this
 * is it, so it answers the two questions in order: what is it doing, and what
 * should I do about it.
 *
 * The temperature is a hero figure, not a chart — a single number gets a stat
 * tile, never a one-bar bar chart.
 */
export function NowCard({ current, today, system }) {
  const rainToday = today?.rain
  const line = headline({ rainToday, tempMax: today?.tempMax, tempMin: today?.tempMin })
  const wet = rainToday != null && rainToday > 0.2

  return (
    <section className="rounded-2xl bg-surface border border-hairline p-5">
      {/* --- what it is doing right now ------------------------------- */}
      <div className="flex items-center gap-4">
        <WeatherIcon
          name={iconForCode(current?.code, current?.isDay)}
          size="4.5rem"
          className="text-rain"
        />
        <div className="min-w-0">
          <p className="text-base font-semibold text-muted uppercase tracking-wide">Right now</p>
          <p className="flex items-baseline gap-1">
            {/* Proportional figures: this number stands alone, it is not in a
                column that has to line up. */}
            <span className="text-6xl font-bold text-ink leading-none">
              {formatTemp(current?.temperature, system)}
            </span>
            <span className="text-2xl font-bold text-ink-2">{system.tempSymbol}</span>
          </p>
          {current?.feelsLike != null && (
            <p className="text-lg text-ink-2 mt-1">
              Feels like {formatTemp(current.feelsLike, system)}{system.tempSymbol}
            </p>
          )}
        </div>
      </div>

      {/* --- and what to do about it ---------------------------------- */}
      <div className="mt-5 pt-5 border-t border-hairline">
        <div className="flex items-center gap-3 flex-wrap">
          <WeatherIcon name={line.icon} size="2.2rem" className="text-ink-2" />
          <p className="text-2xl font-bold text-ink">{line.title} today</p>
          {/* The badge names its own measure. A bare "0.3 mm" beside a
              temperature headline leaves the reader to guess what it counts. */}
          <ToneBadge tone={line.tone}>
            {wet ? `${formatRain(rainToday, system)} ${system.rainSymbol} of rain` : 'No rain'}
          </ToneBadge>
        </div>
        <p className="text-lg text-ink-2 mt-2">{line.advice}</p>
      </div>
    </section>
  )
}
