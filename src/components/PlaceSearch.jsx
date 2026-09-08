import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../core/geocode'
import { Button } from './ui'

/**
 * Town search.
 *
 * Results are a list of large tappable rows, not a dropdown that appears under
 * the cursor and vanishes on the next tap. Search runs on submit as well as on
 * a pause in typing, because "type and wait for something to happen" is not a
 * pattern everyone has learned — there is always a button to press.
 */
export function PlaceSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const abortRef = useRef(null)

  const run = async (text) => {
    const q = text.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSearching(true)
    setError(null)
    try {
      const found = await searchPlaces(q, { signal: controller.signal })
      if (controller.signal.aborted) return
      setResults(found)
      setSearched(true)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError('We could not search just now. Check your connection and try again.')
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }

  // Debounced as-you-type search, so a fast typist doesn't fire six requests.
  useEffect(() => {
    const id = setTimeout(() => run(query), 450)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => () => abortRef.current?.abort(), [])

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); run(query) }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="town" className="text-lg font-semibold text-ink">
          Search for a town or city
        </label>
        <input
          id="town"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="For example: Hanoi"
          autoComplete="off"
          // A 16px minimum stops iOS Safari zooming the page on focus, which
          // leaves the reader stranded at 2x with the keyboard covering the
          // results. The rem sizing here is comfortably past that.
          className="w-full min-h-[3.4rem] px-4 rounded-xl border-2 border-line bg-surface
                     text-xl text-ink placeholder:text-muted"
        />
        <Button type="submit" variant="primary" full disabled={query.trim().length < 2}>
          {searching ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {error && <p className="mt-4 text-lg text-critical font-semibold">{error}</p>}

      {searched && !searching && results.length === 0 && !error && (
        <p className="mt-4 text-lg text-ink-2">
          No places matched “{query.trim()}”. Try the name of a larger town nearby.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 rounded-2xl border-2 border-line overflow-hidden">
          {results.map((place, i) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => { onSelect(place); setResults([]); setQuery(''); setSearched(false) }}
                className={`w-full text-left px-4 py-4 min-h-[3.4rem] bg-surface active:bg-sunken
                            ${i > 0 ? 'border-t-2 border-hairline' : ''}`}
              >
                <span className="block text-xl font-bold text-ink">{place.name}</span>
                {place.detail && <span className="block text-base text-muted mt-0.5">{place.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
