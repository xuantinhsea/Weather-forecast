/**
 * The forecast model roster.
 *
 * Every id here was probed against the live API in September 2026 — several
 * ids that appear in older documentation and in the desktop Explorer are dead:
 * they answer HTTP 200 and return an array of nulls forever. Those are listed
 * in RETIRED at the bottom so nobody re-adds them.
 *
 * `reach` is the number of days ahead the model actually returned at three
 * spread-out test sites, not the number its documentation claims. It is used to
 * explain why the spread narrows as the chart runs out to sixteen days: by day
 * twelve most of these models have simply stopped.
 */

export const MODELS = [
  // --- global ------------------------------------------------------------
  { id: 'icon_seamless',        label: 'ICON',        org: 'DWD, Germany',          scope: 'global', reach: 9 },
  { id: 'gfs_seamless',         label: 'GFS',         org: 'NOAA, United States',   scope: 'global', reach: 18 },
  { id: 'ecmwf_ifs025',         label: 'IFS',         org: 'ECMWF',                 scope: 'global', reach: 17 },
  { id: 'ecmwf_aifs025_single', label: 'AIFS',        org: 'ECMWF — machine learning', scope: 'global', reach: 17 },
  { id: 'gem_seamless',         label: 'GEM',         org: 'ECCC, Canada',          scope: 'global', reach: 12 },
  { id: 'cma_grapes_global',    label: 'GRAPES',      org: 'CMA, China',            scope: 'global', reach: 7 },
  { id: 'arpege_world',         label: 'ARPEGE',      org: 'Météo-France',          scope: 'global', reach: 6 },
  { id: 'jma_seamless',         label: 'JMA GSM',     org: 'JMA, Japan',            scope: 'global', reach: 13 },
  { id: 'ukmo_seamless',        label: 'UKMO',        org: 'Met Office, UK',        scope: 'global', reach: 9 },

  // --- regional ----------------------------------------------------------
  // Outside their own area these fall back to a global model, and several of
  // them fall back to the SAME one — which is why the ensemble de-duplicates
  // identical series rather than counting them as independent opinions.
  { id: 'metno_seamless',             label: 'MET Nordic', org: 'MET Norway',        scope: 'Northern Europe', reach: 17 },
  { id: 'knmi_seamless',              label: 'HARMONIE',   org: 'KNMI, Netherlands', scope: 'North-west Europe', reach: 17 },
  { id: 'dmi_seamless',               label: 'HARMONIE',   org: 'DMI, Denmark',      scope: 'Northern Europe', reach: 17 },
  { id: 'icon_eu',                    label: 'ICON-EU',    org: 'DWD, Germany',      scope: 'Europe', reach: 7 },
  { id: 'arpege_europe',              label: 'ARPEGE-EU',  org: 'Météo-France',      scope: 'Europe', reach: 6 },
  { id: 'arome_france',               label: 'AROME',      org: 'Météo-France',      scope: 'France', reach: 2 },
  { id: 'italia_meteo_arpae_icon_2i', label: 'ICON-2I',    org: 'ARPAE, Italy',      scope: 'Italy', reach: 3 },
]

/** Open-Meteo's own pick per location and lead time. It cannot be combined with
 *  other models in one request — the API rejects the whole call — so it is
 *  always fetched separately and shown as the reference line. */
export const BEST_MATCH = 'best_match'

export const MODEL_IDS = MODELS.map((m) => m.id)
export const modelById = (id) => MODELS.find((m) => m.id === id) ?? null

/**
 * Ids that are still widely documented but return nothing at all. Kept here as
 * a record: each was probed at Hanoi, Oslo and Sydney and produced a full
 * series of nulls, or was rejected outright.
 */
export const RETIRED = {
  ecmwf_ifs04: 'Replaced by ecmwf_ifs025. Returns all nulls.',
  ecmwf_aifs025: 'Replaced by ecmwf_aifs025_single. Returns all nulls.',
  access_global: 'Rejected by the API. The current id is bom_access_global, which itself returns all nulls.',
  bom_access_global: 'Accepted but returns all nulls everywhere tested.',
  kma_seamless: 'Accepted but returns all nulls everywhere tested.',
  kma_gdps: 'Accepted but returns all nulls everywhere tested.',
  gfs_graphcast025: 'Accepted but returns all nulls everywhere tested.',
}
