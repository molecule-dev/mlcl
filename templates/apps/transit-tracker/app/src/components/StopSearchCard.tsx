import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StopListItem, type StopSummary } from './StopListItem.js'

/**
 * Stop search: one input, a live-filtered suggestion list, Enter/tap to open
 * that stop's departures board. The full stop list is fetched once from
 * /api/network/stops and filtered client-side — the network is a few dozen
 * stops, so a server round-trip per keystroke would be pure latency.
 *
 * Used verbatim on the Landing hero and at the top of Nearby.
 */
export function StopSearchCard({ variant = 'hero' }: { variant?: 'hero' | 'inline' }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [stops, setStops] = useState<StopSummary[]>([])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/network/stops')
      .then((res) => {
        if (cancelled) return
        const data = (res as { data?: unknown }).data ?? res
        if (Array.isArray(data)) setStops(data as StopSummary[])
      })
      .catch((err: unknown) => {
        if (!cancelled) console.error('[StopSearchCard] stop list failed:', err)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Close the suggestion dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return stops
      .filter((stop) => stop.name.toLowerCase().includes(q) || stop.code.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, stops])

  const go = (code: string): void => {
    setOpen(false)
    setQuery('')
    navigate(`/stops/${code}`)
  }

  return (
    <div
      ref={rootRef}
      data-mol-id="stop-search"
      className={cm.cn(
        'relative',
        variant === 'hero'
          ? cm.cn(cm.sp('p', 6), 'rounded-3xl bg-surface shadow-lg ring-1 ring-outline-variant/40')
          : '',
      )}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (matches.length > 0) go(matches[0].code)
        }}
        className={cm.flex({ align: 'center', gap: 'sm' })}
        role="search"
      >
        <span
          className={'material-symbols-outlined text-on-surface-variant ml-3'}
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          data-mol-id="stop-search-input"
          aria-label={t(
            'stopSearch.ariaLabel',
            {},
            { defaultValue: 'Search stops by name or code' },
          )}
          placeholder={t(
            'stopSearch.placeholder',
            {},
            { defaultValue: 'Where are you heading? Stop name or code…' },
          )}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 4),
            cm.textSize('base'),
            'bg-transparent outline-none placeholder:text-on-surface-variant/70',
          )}
        />
        <button
          type="submit"
          disabled={matches.length === 0}
          data-mol-id="stop-search-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'shrink-0 rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50',
          )}
        >
          {t('stopSearch.submit', {}, { defaultValue: 'View board' })}
        </button>
      </form>

      {open && matches.length > 0 ? (
        <ul
          data-mol-id="stop-search-results"
          className={cm.cn(
            'absolute left-0 right-0 z-30 overflow-hidden',
            cm.sp('mt', 2),
            'rounded-2xl bg-surface shadow-xl ring-1 ring-outline-variant',
          )}
        >
          {matches.map((stop) => (
            <StopListItem key={stop.code} stop={stop} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
