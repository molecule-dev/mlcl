import { useEffect, useRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

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
export function AddressInput({ onSelect }: { onSelect: (place: Place) => void }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [suggestion, setSuggestion] = useState<Place | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  // After the user picks a suggestion we set the field to its formatted address;
  // this guard stops that programmatic change from re-triggering a lookup.
  const justPicked = useRef(false)

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false
      return
    }

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
        const place = (await res.json()) as Place
        setSuggestion(place)
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
    justPicked.current = true
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
