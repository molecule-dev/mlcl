import { type ReactElement, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * A geocoded place emitted upward when the user picks a suggestion. The field
 * is `lng`, NOT `lon` — it matches `Coordinates` from `@molecule/app-maps` and
 * the `{ lat, lng, formatted }` shape returned by `POST /api/places`.
 */
export type Place = { lat: number; lng: number; formatted: string }

/**
 * Debounced address field. As the user types (min 3 chars) it geocodes the text
 * server-side via `POST /api/places` — which proxies Mapbox and keeps the token
 * off the client — and shows the resolved address as a suggestion. Clicking the
 * suggestion emits `{ lat, lng, formatted }` upward via `onSelect`.
 *
 * `@molecule/app-maps` has no client-side autocomplete widget, so geocoding runs
 * through the API handler. Never call Mapbox directly from the browser with a
 * secret token, and store `(lat, lng, formatted)` — not the raw typed string —
 * as the source of truth.
 */
export function AddressInput({ onSelect }: { onSelect: (place: Place) => void }): ReactElement {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [suggestion, setSuggestion] = useState<Place | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  // After the user picks a suggestion we set the field to its formatted address;
  // this guard stops that programmatic change from re-triggering a lookup. It
  // holds the PICKED value rather than a bare boolean: a boolean is consumed by
  // the effect, and when the picked address IS the current query the `setQuery`
  // is a no-op, the effect never re-runs, and the still-set flag swallowed the
  // reader's NEXT edit — no lookup and no suggestion until they typed again.
  const justPicked = useRef<string | null>(null)

  useEffect(() => {
    const picked = justPicked.current
    // Consume the guard on every run, so a stale value can never suppress a
    // later, unrelated edit.
    justPicked.current = null
    if (picked !== null && picked === query) return

    const address = query.trim()
    if (address.length < 3) {
      setSuggestion(null)
      setStatus('idle')
      return
    }

    setStatus('loading')
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
          signal: controller.signal,
        })
        if (!res.ok) {
          setSuggestion(null)
          setStatus('error')
          return
        }
        // A 2xx proves the route ANSWERED, not that the body is a place: an
        // endpoint with no fixture answers 200 with an empty object (the mock
        // API server's unmatchedFixtureResponse), and a proxy can rewrite a
        // failure into a 200 whose body is `{ error }`. Installed as the
        // suggestion, that body rendered an empty button, and picking it handed
        // `onSelect` — and the field — `undefined` coordinates. Same rule as the
        // sibling slices: validate the shape before it reaches state and report
        // the failure like any other lookup miss.
        const body = (await res.json().catch(() => null)) as Partial<Place> | null
        if (
          !body ||
          typeof body.lat !== 'number' ||
          typeof body.lng !== 'number' ||
          typeof body.formatted !== 'string' ||
          body.formatted.length === 0
        ) {
          setSuggestion(null)
          setStatus('error')
          return
        }
        setSuggestion({ lat: body.lat, lng: body.lng, formatted: body.formatted })
        setStatus('idle')
      } catch (_error) {
        // A cancelled request (the user kept typing) is expected — ignore it.
        // Surface only real network/geocoding failures.
        if (!controller.signal.aborted) {
          setSuggestion(null)
          setStatus('error')
        }
      }
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  function choose(place: Place): void {
    justPicked.current = place.formatted
    setQuery(place.formatted)
    setSuggestion(null)
    setStatus('idle')
    onSelect(place)
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))} style={{ maxWidth: '28rem' }}>
      <input
        type="text"
        data-mol-id="address-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('address.placeholder', undefined, { defaultValue: 'Search an address' })}
        aria-label={t('address.ariaLabel', undefined, { defaultValue: 'Address' })}
        className={cm.input({})}
      />
      {status === 'loading' ? (
        <p className={cm.textMuted}>
          {t('address.searching', undefined, { defaultValue: 'Searching…' })}
        </p>
      ) : null}
      {status === 'error' ? (
        <p className={cm.textError}>
          {t('address.notFound', undefined, { defaultValue: 'No match for that address' })}
        </p>
      ) : null}
      {suggestion ? (
        <button
          type="button"
          data-mol-id="address-suggestion"
          onClick={() => choose(suggestion)}
          className={cm.cn(cm.card({}), cm.sp('p', 3))}
          style={{ textAlign: 'left', cursor: 'pointer' }}
        >
          {suggestion.formatted}
        </button>
      ) : null}
    </div>
  )
}

export default AddressInput
