import { useCallback, useEffect, useState } from 'react'
import { AppHeader, FreshnessBar } from './components/AppHeader'
import { BottomNav } from './components/BottomNav'
import { TodayScreen } from './screens/TodayScreen'
import { DaysScreen } from './screens/DaysScreen'
import { PlaceScreen } from './screens/PlaceScreen'
import { useForecast } from './hooks/useForecast'
import { useSettings } from './hooks/useSettings'
import { useOnline } from './hooks/useOnline'
import { useGeolocation } from './hooks/useGeolocation'
import { loadPlace, savePlace } from './core/storage'
import { describePoint } from './core/geocode'
import { getSystem } from './core/units'

export default function App() {
  const [place, setPlaceState] = useState(loadPlace)
  const [tab, setTab] = useState(() => (loadPlace() ? 'today' : 'place'))

  const { settings, update: updateSettings } = useSettings()
  const online = useOnline()
  const { forecast, loading, error, refresh } = useForecast(place)
  const system = getSystem(settings.units)

  const setPlace = useCallback((next) => {
    setPlaceState(next)
    savePlace(next)
  }, [])

  // A returning reader who has already granted location gets a fresh position
  // without being asked again. A first-time reader is not prompted at all —
  // they pick a place themselves, and the button is there when they want it.
  const { autoLocate } = useGeolocation(async (coords) => {
    const described = await describePoint(coords.lat, coords.lon)
    setPlace({ ...coords, ...described })
  })
  useEffect(() => { if (!place) autoLocate() }, [place, autoLocate])

  // Coming back to the app after a while should not leave stale numbers on
  // screen. Anything older than fifteen minutes is quietly refetched.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!forecast || Date.now() - forecast.fetchedAt > 15 * 60 * 1000) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [forecast, refresh])

  const screenProps = {
    forecast,
    loading,
    error,
    system,
    onRetry: refresh,
  }

  return (
    <div className="app-shell flex flex-col bg-plane">
      <AppHeader
        place={place}
        onRefresh={refresh}
        refreshing={loading}
        onOpenPlace={() => setTab('place')}
      />

      <FreshnessBar
        online={online}
        error={error}
        fetchedAt={forecast?.fetchedAt}
        onRefresh={refresh}
      />

      {/* The scrolling region. overscroll-contain stops a swipe at the end of a
          screen from dragging the whole page and bouncing the header away. */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {tab === 'today' && <TodayScreen {...screenProps} />}
        {tab === 'days' && <DaysScreen {...screenProps} />}
        {tab === 'place' && (
          <PlaceScreen
            place={place}
            onPlaceChange={setPlace}
            settings={settings}
            onSettingsChange={updateSettings}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
