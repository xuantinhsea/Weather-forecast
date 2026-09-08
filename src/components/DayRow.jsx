import { WeatherIcon } from './WeatherIcon'
import { iconForCode } from '../core/weatherCodes'
import { formatTemp, formatRain, toRain } from '../core/units'
import { describeDayRain, dayName, dayDate } from '../core/plainLanguage'

/**
 * One day in the list.
 *
 * The layout is deliberately a table read left to right: when, what, how warm.
 * The inline rain bar is a sparkline, scaled against the wettest day on screen
 * so the comparison between rows is honest — each row scaled to its own maximum
 * would make every day look equally wet.
 */
export function DayRow({ day, system, maxRain, isFirst }) {
  const band = describeDayRain(day.rain)
  const rain = toRain(day.rain, system) ?? 0
  const scale = maxRain > 0 ? Math.min(100, (rain / maxRain) * 100) : 0

  return (
    <li className={`py-4 ${isFirst ? '' : 'border-t border-hairline'}`}>
      <div className="flex items-start gap-3">
        <WeatherIcon
          name={day.rain > 0.2 ? band?.icon ?? 'rain' : iconForCode(day.code, true)}
          size="2.6rem"
          className={day.rain > 0.2 ? 'text-rain' : 'text-temp'}
        />

        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-ink leading-tight">{dayName(day.date)}</p>
          <p className="text-base text-muted">{dayDate(day.date)}</p>

          <p className="text-lg text-ink-2 mt-1.5">
            {band?.label}
            {day.rain > 0.2 && (
              <span className="text-ink font-semibold">
                {' · '}{formatRain(day.rain, system)} {system.rainSymbol}
              </span>
            )}
          </p>

          {/* The bar is decoration for the number beside it, never the only
              carrier of the value — hence the width, and the text. */}
          <div className="mt-1.5 h-2.5 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-rain" style={{ width: `${scale}%` }} />
          </div>
        </div>

        {/* tabular-nums: these ARE a column that has to line up. */}
        <div className="text-right shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <p className="text-3xl font-bold text-ink leading-none">
            {formatTemp(day.tempMax, system)}°
          </p>
          <p className="text-xl text-muted mt-1">
            {formatTemp(day.tempMin, system)}°
          </p>
        </div>
      </div>
    </li>
  )
}
