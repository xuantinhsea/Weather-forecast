import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { normalizeCoords } from '../core/geocode'

/**
 * The map is for confirming, not exploring.
 *
 * Someone who has just searched for their town needs to see "yes, that is my
 * town" before trusting the numbers. So it opens close in, carries one large
 * unmistakable pin, and answers a tap anywhere by moving the pin there. There
 * is no drawing, no layer switcher, no drag-the-marker gesture — a pin you can
 * knock out of place by scrolling is a trap.
 */

// Leaflet's default marker resolves its icon URLs relative to the CSS file,
// which the bundler rewrites; building the icon explicitly avoids the broken
// image that would otherwise appear. It is also simply too small — this one is
// sized to be visible at arm's length.
const PIN = L.divIcon({
  className: '',
  html: `
    <svg viewBox="0 0 32 44" width="40" height="55" aria-hidden="true">
      <path d="M16 43C16 43 30 26.5 30 16A14 14 0 0 0 2 16c0 10.5 14 27 14 27Z"
            fill="#d03b3b" stroke="#ffffff" stroke-width="3"/>
      <circle cx="16" cy="16" r="5.2" fill="#ffffff"/>
    </svg>`,
  iconSize: [40, 55],
  iconAnchor: [20, 55],   // the point of the pin, not its middle
})

function Recenter({ lat, lon }) {
  const map = useMap()
  useEffect(() => {
    // Keep whatever zoom the reader has chosen; only move the centre.
    map.setView([lat, lon], map.getZoom(), { animate: true })
  }, [lat, lon, map])
  return null
}

function TapToPick({ onPick }) {
  useMapEvents({
    click(e) {
      const c = normalizeCoords(e.latlng.lat, e.latlng.lng)
      if (c) onPick(c)
    },
  })
  return null
}

export function PlaceMap({ lat, lon, onPick, height = '17rem' }) {
  const center = useMemo(() => [lat, lon], [lat, lon])

  return (
    <div
      style={{ height }}
      className="rounded-2xl overflow-hidden border-2 border-line"
    >
      <MapContainer
        center={center}
        zoom={10}
        // Scroll-wheel zoom steals the page scroll on a laptop, so it stays
        // off; the +/- buttons zoom instead, and they are large enough to hit.
        // Dragging stays ON — the card is only part of the screen, so there is
        // page either side of it to scroll from, and a map that cannot be moved
        // is worse than one that occasionally catches a scroll.
        scrollWheelZoom={false}
        zoomControl
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={18}
        />
        <Marker position={center} icon={PIN} />
        <Recenter lat={lat} lon={lon} />
        <TapToPick onPick={onPick} />
      </MapContainer>
    </div>
  )
}
