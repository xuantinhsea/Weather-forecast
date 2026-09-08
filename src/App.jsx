import { useCallback, useEffect, useState } from 'react'
import { AppHeader, FreshnessBar } from './components/AppHeader'
import { BottomNav } from './components/BottomNav'
import { SpreadScreen } from './screens/SpreadScreen'
import { ModelsScreen } from './screens/ModelsScreen'
import { PlaceScreen } from './screens/PlaceScreen'
import { useEnsemble } from './hooks/useEnsemble'
import { useSettings } from './hooks/useSettings'
import { useOnline } from './hooks/useOnline'
import { useGeolocation } from './hooks/useGeolocation'
import { loadPlace, savePlace } from './core/storage'
import { describePoint } from './core/geocode'

export default function App() {
  const [place, setPlaceState] = useState(loadPlace)
  const [tab, setTab] = useState(() => (loadPlace() ? 'spread' : 'place'))
  // Which single model is drawn on top of the band. Held here rather than in a
  // screen because it is set from the Models list and read by the Spread chart.
  const [pinned, setPinned] = useState(null)

  const { settings, update: updateSettings } = useSettings()
  const online = useOnline()
  const { data, loading, error, refresh } = useEnsemble(place)

  const setPlace = useCallback((next) => {
    setPlaceState(next)
    savePlace(next)
    // A model pinned at one place may not even answer at the next one.
    setPinned(null)
  }, [])

  // A returning reader who already granted location gets a fresh position
  // without being asked again. A first-time reader is never prompted — an
  // unrequested permission dialog on open is the fastest route to a permanent
  // block, after which the button no longer works either.
  const { autoLocate } = useGeolocation(async (coords) => {
    const described = await describePoint(coords.lat, coords.lon)
    setPlace({ ...coords, ...described })
  })
  useEffect(() => { if (!place) autoLocate() }, [place, autoLocate])

  // Model runs land every few hours; anything older than fifteen minutes on
  // returning to the app is quietly refetched.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!data || Date.now() - data.fetchedAt > 15 * 60 * 1000) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [data, refresh])

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
        fetchedAt={data?.fetchedAt}
        onRefresh={refresh}
      />

      {/* overscroll-contain stops a swipe past the end of a screen from
          dragging the whole page and bouncing the header away. */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {tab === 'spread' && (
          <SpreadScreen
            data={data}
            loading={loading}
            error={error}
            onRetry={refresh}
            pinned={pinned}
            onPin={setPinned}
          />
        )}
        {tab === 'models' && (
          <ModelsScreen
            data={data}
            loading={loading}
            error={error}
            pinned={pinned}
            onPin={setPinned}
          />
        )}
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
