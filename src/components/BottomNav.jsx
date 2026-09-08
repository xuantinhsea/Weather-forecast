/**
 * The whole navigation of the app: three destinations, always visible, always
 * in the same place, each labelled in words.
 *
 * No hamburger menu, no tabs that scroll off, no gestures. A control that is
 * hidden behind a symbol is a control that does not exist for a reader who has
 * not been taught the symbol.
 */

const ICONS = {
  today: (
    <g>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </g>
    </g>
  ),
  days: (
    <g stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" fill="none">
      <rect x="3.2" y="5" width="17.6" height="16" rx="3" />
      <path d="M3.2 10h17.6M8 3v4M16 3v4" strokeLinecap="round" />
    </g>
  ),
  place: (
    <g>
      <path d="M12 21.5S5 13.8 5 9.6a7 7 0 0 1 14 0c0 4.2-7 11.9-7 11.9Z"
            fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.6" fill="currentColor" />
    </g>
  ),
}

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'days', label: '7 days' },
  { id: 'place', label: 'Place' },
]

export function BottomNav({ active, onChange }) {
  return (
    <nav
      className="safe-bottom shrink-0 bg-surface border-t-2 border-line"
      aria-label="Main"
    >
      <ul className="grid grid-cols-3">
        {TABS.map((tab) => {
          const on = tab.id === active
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={on ? 'page' : undefined}
                className={`w-full min-h-[4rem] flex flex-col items-center justify-center gap-0.5
                            py-2 active:bg-sunken
                            ${on ? 'text-brand' : 'text-muted'}`}
              >
                <svg viewBox="0 0 24 24" width="1.7rem" height="1.7rem" aria-hidden="true"
                     style={{ width: '1.7rem', height: '1.7rem' }}>
                  {ICONS[tab.id]}
                </svg>
                <span className={`text-base leading-tight ${on ? 'font-bold' : 'font-semibold'}`}>
                  {tab.label}
                </span>
                {/* The selected tab is marked by weight and an underline as
                    well as colour, so the state is never colour-alone. */}
                <span
                  className={`block h-1 w-8 rounded-full ${on ? 'bg-brand' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
