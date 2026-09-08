/**
 * The shared primitives.
 *
 * Two rules run through all of them:
 *   - Nothing interactive is smaller than 3.4rem tall (~61px at the default
 *     text size, and it grows from there). Guidance says 44px; that is a floor
 *     for steady hands.
 *   - No icon-only controls. A pictogram alone is a guess; every button says
 *     what it does in words.
 */

/** A white card on the page plane. The whole app is a stack of these. */
export function Card({ children, className = '', ...rest }) {
  return (
    <section
      className={`rounded-2xl bg-surface border border-hairline p-4 ${className}`}
      {...rest}
    >
      {children}
    </section>
  )
}

/** Section heading. Sentence case, no shouting, no abbreviations. */
export function CardTitle({ children, hint }) {
  return (
    <header className="mb-3">
      <h2 className="text-xl font-bold text-ink leading-tight">{children}</h2>
      {hint && <p className="text-base text-muted mt-0.5">{hint}</p>}
    </header>
  )
}

const VARIANTS = {
  primary: 'bg-brand text-brand-ink border-brand active:brightness-90',
  secondary: 'bg-surface text-ink border-line active:bg-sunken',
  quiet: 'bg-sunken text-ink border-transparent active:bg-line',
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  full = false,
  disabled = false,
  type = 'button',
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2.5
        min-h-[3.4rem] px-5 rounded-xl border-2
        text-lg font-semibold leading-tight
        transition-[filter,background-color] duration-100
        disabled:opacity-45
        ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * A segmented choice — used for units and text size. Rendered as radios rather
 * than buttons so a screen reader announces "2 of 3 selected", and so the whole
 * group is one tab stop instead of three.
 */
export function Choice({ legend, options, value, onChange, name }) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="text-lg font-semibold text-ink mb-2">{legend}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-2">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <label
              key={String(opt.value)}
              className={`
                flex items-center justify-center text-center
                min-h-[3.4rem] px-2 rounded-xl border-2 cursor-pointer
                text-base font-semibold leading-tight
                ${active
                  ? 'bg-brand text-brand-ink border-brand'
                  : 'bg-surface text-ink border-line'}
              `}
            >
              <input
                type="radio"
                name={name}
                checked={active}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/**
 * The status pill. Colour is doubled by the word inside it, so it survives
 * colourblindness, a sun-washed screen, and forced-colours mode.
 */
const TONE_CLASS = {
  calm: 'bg-rain-soft text-ink border-rain',
  good: 'bg-rain-soft text-ink border-good',
  warning: 'bg-temp-soft text-ink border-warning',
  serious: 'bg-temp-soft text-ink border-serious',
  critical: 'bg-temp-soft text-ink border-critical',
}

export function ToneBadge({ tone = 'calm', children }) {
  return (
    <span className={`inline-flex items-center rounded-full border-2 px-3 py-1 text-base font-bold ${TONE_CLASS[tone] ?? TONE_CLASS.calm}`}>
      {children}
    </span>
  )
}

/** A short, plain message with a way out of it. Never a bare error string. */
export function Notice({ title, children, action, tone = 'warning' }) {
  const border = tone === 'critical' ? 'border-critical' : 'border-warning'
  return (
    <div className={`rounded-2xl border-2 ${border} bg-surface p-4`} role="status">
      <p className="text-lg font-bold text-ink">{title}</p>
      {children && <p className="text-base text-ink-2 mt-1">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Getting the forecast…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <div
        className="h-10 w-10 rounded-full border-4 border-line border-t-brand animate-spin"
        aria-hidden="true"
      />
      <p className="text-lg text-ink-2">{label}</p>
    </div>
  )
}
