# Weather Ready

A rain-and-temperature forecast for the week ahead, built to be read and operated
by someone who is not comfortable with phones — large type, plain words, and no
hidden controls. It installs to the home screen and keeps working when the signal
does not.

It is a companion to [Open-Meteo Explorer](../open-meteo-explorer), which is the
full research tool. This one deliberately does much less.

## What it shows

Two things, and nothing else: **how much rain**, and **how warm**.

- **Today** — the temperature now, one plain-language line about the day
  ("Heavy rain today · Stay in if you can. Low roads may flood."), then the next
  24 hours as two separate charts.
- **7 days** — rain per day, the temperature range per day, and a day-by-day list.
- **Place** — GPS, town search, or a tap on the map. Units and text size live here.

Every number also has words attached. `45 mm` means nothing to most people;
"heavy rain — flooding is likely, avoid travel" means something.

## Design rules

These are the constraints the whole app is built against. They are worth knowing
before changing anything.

**Type and targets.** The root font size is 18px, not the browser's 16px, and the
text-size control multiplies it. Every dimension in the app is in `rem`, so that
one control grows the buttons, the gaps, the icons and the chart labels together —
not just the letters. Nothing interactive is under `3.4rem` tall.

**Nothing is hidden.** No hamburger menu, no gestures, no icon-only buttons. Three
tabs, always visible, always labelled in words.

**Colour is never the only signal.** The selected tab has a colour, a weight and
an underline. A status badge has a colour and the word. A rain bar has a length
and the number beside it.

**Two charts, never one.** Rain and temperature are never plotted together. Two
measures on one plot need two y-scales, and the alignment between them is
arbitrary — it invents a relationship that is not in the data.

**The chart palette is validated, not eyeballed.** Warm orange for temperature,
blue for rain. Both clear the colour-vision-deficiency separation, normal-vision
and 3:1 contrast gates against the light and the dark surface. The four status
colours are reserved and never stand in for a data series.

**Labels are measured before they are drawn.** At the largest text size, seven
columns of `33°` will not fit; the charts measure and leave them off rather than
overlap, and the day list carries the exact numbers instead.

**Being offline is a normal state, not an error.** During a storm the network is
the first thing to go. The last forecast is kept on the device and shown with an
honest "this is not fresh" line, rather than an error page at the moment the
forecast is most needed.

**Freshness is measured, not assumed.** `navigator.onLine` reports true on a
Wi-Fi with no route out, so the strip is driven by how old the data actually is.
And because the service worker replays a stored response when the network is
gone — which resolves *successfully* — the age comes from the response's own
`Date` header rather than from `Date.now()` at parse time. Otherwise a day-old
forecast would announce itself as "updated just now", which is the one thing
this app must never do.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm run lint
npm run icons      # regenerate the PWA icons from scripts/make-icons.mjs
```

Geolocation needs a secure context. `localhost` counts; a LAN IP over plain
`http` does not.

## Layout

```
src/
  core/         no React anywhere in here — portable to a native shell later
    openMeteo.js      forecast fetch + the shape the screens actually use
    plainLanguage.js  numbers -> words; every threshold in the app lives here
    aggregate.js      hourly readings -> the blocks a chart can label
    units.js          metric in, the reader's choice out
    geocode.js        town search, reverse lookup, coordinate wrapping
    storage.js        the remembered place, settings, and the offline forecast
    weatherCodes.js   WMO codes -> an icon name
  hooks/        React bindings over the above
  components/   the shared primitives, the icon set, the map
    charts/     Chart.js setup, shared chrome, and the three charts
  screens/      Today, 7 days, Place
scripts/
  make-icons.mjs  draws the PWA icons from scratch; no binary assets in git
```

## Data

Forecasts from [Open-Meteo](https://open-meteo.com) (free, no key, CC-BY 4.0).
Map tiles from [OpenStreetMap](https://www.openstreetmap.org/copyright).

Open-Meteo answers `200` with an all-null series when a model has no data for a
point, rather than failing. `openMeteo.js` checks for that explicitly — a
successful fetch is not the same as usable data.

## Deploying

Both targets build from the same source:

- **Vercel** — serves from the domain root; `vercel.json` sets the cache headers
  that keep an installed app from pinning itself to an old service worker.
- **GitHub Pages** — `.github/workflows/deploy.yml` builds with
  `VITE_BASE_PATH=/weather-ready/`, which also feeds the manifest's `start_url`
  and `scope`. An installed app whose `start_url` sits outside its `scope` opens
  in a browser tab instead of standalone.

## Not in this version

Flood-specific work — river discharge and return-period thresholds, rainfall
accumulation alerts, a saved watchlist of sites — is deliberately left out of the
first version. The plain-language bands in `core/plainLanguage.js` are where that
would start.
