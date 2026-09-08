import { WeatherIcon } from './WeatherIcon'

/**
 * A single line saying where these numbers are for, plus the refresh.
 *
 * The place name lives here rather than inside a screen because it is the one
 * piece of context every screen depends on — a forecast for the wrong town is
 * worse than no forecast, so it should never be more than a glance away.
 */
export function AppHeader({ place, onRefresh, refreshing, onOpenPlace }) {
  return (
    <header className="safe-top shrink-0 bg-brand text-brand-ink">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onOpenPlace}
          className="flex-1 min-w-0 text-left min-h-[2.8rem] rounded-lg px-1 active:opacity-80"
        >
          <span className="block text-sm font-semibold opacity-85 uppercase tracking-wide">
            Forecast for
          </span>
          <span className="block text-xl font-bold truncate">
            {place?.name ?? 'Choose a place'}
          </span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || !place}
          aria-label="Get the latest forecast"
          className="shrink-0 min-h-[3rem] min-w-[3rem] px-3 rounded-xl
                     border-2 border-brand-ink/35 flex items-center gap-2
                     text-base font-semibold active:opacity-80 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="1.3rem" height="1.3rem" aria-hidden="true"
               style={{ width: '1.3rem', height: '1.3rem' }}
               className={refreshing ? 'animate-spin' : ''}>
            <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"
                  fill="none" stroke="currentColor" strokeWidth="2.3"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{refreshing ? 'Updating' : 'Update'}</span>
        </button>
      </div>
    </header>
  )
}

/** The offline / stale-data strip. Honest about what the reader is looking at. */
export function FreshnessBar({ online, stale, updatedLabel, error }) {
  if (online && !stale && !error) return null

  const critical = !online || stale
  return (
    <div
      role="status"
      className={`shrink-0 px-4 py-2.5 flex items-center gap-2.5 border-b-2
                  ${critical ? 'bg-temp-soft border-warning' : 'bg-sunken border-hairline'}`}
    >
      <WeatherIcon name="cloud" size="1.4rem" className="text-ink-2" />
      <p className="text-base font-semibold text-ink leading-tight">
        {!online
          ? `No internet. ${updatedLabel ? `Showing what we saved — ${updatedLabel.toLowerCase()}.` : 'Showing the last forecast we saved.'}`
          : stale
            ? `Could not reach the weather service. ${updatedLabel ? updatedLabel : 'Showing a saved forecast'}.`
            : error}
      </p>
    </div>
  )
}
