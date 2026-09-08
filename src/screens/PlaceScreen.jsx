import { useState } from 'react'
import { Card, CardTitle, Button, Choice, Notice } from '../components/ui'
import { PlaceSearch } from '../components/PlaceSearch'
import { PlaceMap } from '../components/PlaceMap'
import { useGeolocation } from '../hooks/useGeolocation'
import { describePoint, formatCoords } from '../core/geocode'
import { SYSTEMS } from '../core/units'
import { TEXT_SCALES } from '../hooks/useSettings'

/**
 * Choosing a place, and the two settings worth having.
 *
 * Three ways in, in the order people actually reach for them: the GPS button,
 * a search box, and the map for anyone who would rather point at it than spell
 * it. All three land in the same place, and the map always shows the current
 * choice so the reader can confirm it before trusting the numbers.
 */
export function PlaceScreen({ place, onPlaceChange, settings, onSettingsChange }) {
  const [naming, setNaming] = useState(false)

  const adopt = async (coords, name) => {
    if (name) {
      onPlaceChange({ ...coords, name: name.name, detail: name.detail })
      return
    }
    // A bare pair of coordinates means nothing to a reader; go and find out what
    // the place is called, but show the pin immediately rather than making them
    // wait on a second network round trip.
    onPlaceChange({ ...coords, name: 'Finding the name…', detail: formatCoords(coords.lat, coords.lon) })
    setNaming(true)
    try {
      const described = await describePoint(coords.lat, coords.lon)
      onPlaceChange({ ...coords, ...described })
    } finally {
      setNaming(false)
    }
  }

  const { locate, locating, error: gpsError, supported, clearError } = useGeolocation(
    (coords) => adopt(coords),
  )

  return (
    <div className="p-4 flex flex-col gap-4">
      <Card>
        <CardTitle hint={place ? [place.detail, formatCoords(place.lat, place.lon)].filter(Boolean).join(' · ') : undefined}>
          {place ? place.name : 'No place chosen yet'}
        </CardTitle>

        {place && (
          <PlaceMap
            lat={place.lat}
            lon={place.lon}
            onPick={(coords) => adopt(coords)}
          />
        )}

        <p className="text-base text-muted mt-2">
          {place
            ? 'Tap the map to move the pin. Drag it to look around, or use the + and − buttons to zoom.'
            : 'Use the button below, or search for your town.'}
        </p>
      </Card>

      <Card>
        <CardTitle>Use where I am now</CardTitle>
        {supported ? (
          <Button variant="primary" full onClick={locate} disabled={locating || naming}>
            {locating ? 'Finding you…' : 'Use my location'}
          </Button>
        ) : (
          <p className="text-lg text-ink-2">
            This browser cannot use your location. Please search for your town below.
          </p>
        )}
        {gpsError && (
          <div className="mt-3">
            <Notice
              title="We could not find you"
              action={<Button onClick={clearError}>Close</Button>}
            >
              {gpsError}
            </Notice>
          </div>
        )}
      </Card>

      <Card>
        <PlaceSearch onSelect={(found) => adopt({ lat: found.lat, lon: found.lon }, found)} />
      </Card>

      <Card>
        <CardTitle>Settings</CardTitle>
        <div className="flex flex-col gap-5">
          <Choice
            name="units"
            legend="Units"
            value={settings.units}
            onChange={(units) => onSettingsChange({ units })}
            options={Object.values(SYSTEMS).map((s) => ({ value: s.id, label: s.short }))}
          />
          <Choice
            name="textScale"
            legend="Text size"
            value={settings.textScale}
            onChange={(textScale) => onSettingsChange({ textScale })}
            options={TEXT_SCALES}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>About</CardTitle>
        <p className="text-lg text-ink-2">
          Model Spread runs the same question past sixteen weather models at
          once and shows you where they disagree — over the past two weeks and
          the next sixteen days. It keeps the last answer on your phone, so it
          still works when the signal does not.
        </p>
        <p className="text-base text-muted mt-3">
          Forecasts from Open-Meteo. Map by OpenStreetMap.
        </p>
      </Card>
    </div>
  )
}
