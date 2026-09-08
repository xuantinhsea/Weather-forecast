# Model Spread

Sixteen weather models, side by side, on a phone — fourteen days behind and
sixteen days ahead.

Every other weather app shows you one number. This one shows **how much the
models disagree about it**, which before a flood is the more useful fact: when
GEM says 4.7 mm and another model says 64 mm for the same Thursday, the honest
answer is not their average.

It is the phone-shaped companion to [Open-Meteo Explorer](../open-meteo-explorer),
which remains the full desktop research tool.

## What it shows

- **Spread** — the whole 30-day window as a grey band running from the lowest to
  the highest model, the middle half darker, the middle model as a line, and
  Open-Meteo's own Best Match dashed over the top. A vertical rule marks today,
  so a fortnight of history sits directly against a fortnight of forecast. Tap
  any day.
- **Today, hour by hour** — the same encoding over today's 24 hours, with the
  rule on the current hour instead of today. This is where models diverge most
  visibly: they can agree on a day's total and still disagree about whether it
  arrives at breakfast or at four in the afternoon. Tap any hour.
- **Models** — the roster. Which of the sixteen answered here, how many days each
  actually reaches, today's value, and how far it sits from the middle. Tap one
  to draw it on the chart.
- **Place** — GPS, town search, or a tap on the map.

Three variables: daily rain total, daytime high, overnight low. Hourly data has
no daily maximum or minimum, so High and Low both resolve to the temperature at
each hour, and the card says so rather than implying an hourly high.

## The three things that make it honest

**Identical models are counted once — but only when they really are the same
model.** Ask about Hanoi and MET Nordic, KNMI and DMI return *byte-identical*
series, because outside their own region they all fall back to the same global
model. Counting them as three agreeing forecasts would manufacture confidence
that does not exist. At Oslo the same three are genuinely distinct and all count.

Duplication is decided **once, from a signature variable** (temperature), then
applied to every variable. Deciding it per-variable was wrong in a way that
mattered: over a single day several models forecast zero rain for all 24 hours,
producing identical precipitation series — and those models genuinely and
independently agree that it will not rain. Folding them collapsed the hourly rain
count from 10 models to 7 and understated real agreement.

**Outliers are shown, not smoothed.** Rainfall is violently skewed: one model can
forecast 330 mm for a single day at Hanoi while the rest sit under 10 mm. Scaling
the axis to that peak squashes four readable weeks into the bottom tenth of the
chart; clipping it away deletes the single most important sentence the app can
say. So the y-axis ceiling comes from a percentile, and the days that overshoot
are marked at the top **with their value** — visible, numbered, and not allowed
to flatten everything else.

**Freshness is measured, not assumed.** `navigator.onLine` reports true on a
Wi-Fi with no route out. Worse, the service worker replays a stored response when
the network is gone, so the request *succeeds* — and `Date.now()` would report a
day-old answer as "updated just now". The age comes from the response's own
`Date` header, which travels with the cached copy.

## Model roster

Every id was probed against the live API in September 2026 at Hanoi, Oslo and
Sydney. Several ids still in circulation are **dead** — they answer HTTP 200 and
return nulls forever — and are recorded in `RETIRED` in `core/models.js` so
nobody re-adds them: `ecmwf_ifs04`, `ecmwf_aifs025`, `access_global`,
`bom_access_global`, `kma_seamless`, `kma_gdps`, `gfs_graphcast025`.

| | Model | Centre | Reach |
|---|---|---|---|
| Global | ICON | DWD, Germany | ~9 d |
| | GFS | NOAA, United States | ~18 d |
| | IFS | ECMWF | ~17 d |
| | AIFS | ECMWF — machine learning | ~17 d |
| | GEM | ECCC, Canada | ~12 d |
| | GRAPES | CMA, China | ~7 d |
| | ARPEGE | Météo-France | ~6 d |
| | JMA GSM | JMA, Japan | ~13 d |
| | UKMO | Met Office, UK | ~9 d |
| Regional | MET Nordic | MET Norway | ~17 d |
| | HARMONIE | KNMI, Netherlands | ~17 d |
| | HARMONIE | DMI, Denmark | ~17 d |
| | ICON-EU | DWD, Germany | ~7 d |
| | ARPEGE-EU | Météo-France | ~6 d |
| | AROME | Météo-France | ~2 d |
| | ICON-2I | ARPAE, Italy | ~3 d |

`reach` is what each model actually returned, not what its documentation claims.
It is why the band narrows towards the right of the chart: by day twelve most of
these have simply stopped.

## API notes worth knowing

- `best_match` **cannot** be combined with other model ids — passing it alongside
  them makes the API reject the whole call. It is fetched as a second request.
- The API can answer **HTTP 200 with invalid JSON**, emitting bare `nan` tokens,
  for a regional model asked about a point outside its domain. `res.json()`
  throws on that, so bodies are parsed by hand.
- It also answers 200 with an all-null series rather than an error when a model
  has no data for a point. A successful fetch is not the same as usable data.
- All sixteen models, three daily variables, thirty days is about **10 KB** and
  under a second. The same span hourly is ~110 KB — but today alone, hourly, is
  **5 KB**, which is why the app fetches the month daily and the day hourly.
- The hourly window can carry **more** models than the daily one: at Hanoi twelve
  models return hourly data where ten produce daily aggregates.

## Design rules

Carried over from the readable-on-a-phone brief, and they still hold:

- Root font size is 18px and every dimension is in `rem`, so the text-size
  control grows buttons, gaps and chart labels together. Nothing interactive is
  under `3.4rem`.
- Three always-visible labelled tabs. No hamburger, no gestures, no icon-only
  controls.
- **Not sixteen coloured lines.** Past about eight hues nothing is
  distinguishable, and a tangle of lines answers no question anyway. The models
  are anonymous grey; hue is spent only on the three things that have names —
  middle model, Best Match, and the pinned model. Those three clear the
  colour-vision, normal-vision and contrast gates as an all-pairs set in both
  light and dark.
- Identity is never colour alone: every line is named in the legend, Best Match
  is dashed as well as orange, and the Models screen is the table view carrying
  every value as text.
- Charts measure their labels before drawing them, so the largest text size
  degrades rather than overlapping.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm run lint
npm run icons      # regenerate the PWA icons from scripts/make-icons.mjs
```

Geolocation needs a secure context; `localhost` counts, a LAN IP over plain
`http` does not.

## Layout

```
src/
  core/         no React in here — runnable straight from Node, which is how the
                model roster was probed
    models.js         the sixteen ids, what each is, and what is retired
    ensemble.js       fetching, de-duplication, per-day distribution, spread wording
    geocode.js        town search, reverse lookup, coordinate wrapping
    storage.js        remembered place, settings, and the offline copy
    units.js          display formatting
    plainLanguage.js  dates and durations
  hooks/
  components/
    DaySpread.jsx     one day, every model: the dot strip and the value list
    charts/SpreadChart.jsx
  screens/      Spread, Models, Place
```

## Data

Forecasts from [Open-Meteo](https://open-meteo.com) (free, no key, CC-BY 4.0).
Map tiles from [OpenStreetMap](https://www.openstreetmap.org/copyright).

## Deploying

- **Vercel** — serves from the domain root; `vercel.json` sets the cache headers
  that stop an installed app pinning itself to an old service worker.
- **GitHub Pages** — the workflow builds with `VITE_BASE_PATH=/model-spread/`,
  which also feeds the manifest's `start_url` and `scope`.

## Not in this version

Hourly resolution beyond today, ensemble members within a single model, and
flood-specific series such as river discharge and return periods.
