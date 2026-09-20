import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StopListItem, type StopSummary } from '../components/StopListItem.js'
import { StopSearchCard } from '../components/StopSearchCard.js'

interface SavedStopRow {
  id: string
  code: string
  name: string
  hub: boolean
}

interface LineRow {
  code: string
  name: string
  kind: string
  color: string
  /** Stop codes in direction-0 order (from /api/network/lines). */
  stops?: string[]
}

/**
 * Home for signed-in riders: stop search on top, saved stops next, then the
 * full stop list with interchanges (hubs) first — the "nearby-ish" default
 * for a fictional city where device geolocation has nothing real to compare
 * against. Lines per stop come from /api/network/lines (one request) and are
 * joined client-side; the network is tiny by design.
 */
export function Nearby() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [stops, setStops] = useState<StopSummary[]>([])
  const [lines, setLines] = useState<LineRow[]>([])
  const [saved, setSaved] = useState<SavedStopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/network/stops'),
      http.get('/api/network/lines'),
      http.get('/api/saved-stops').catch(() => ({ data: [] as SavedStopRow[] })),
    ])
      .then(([stopsRes, linesRes, savedRes]) => {
        if (cancelled) return
        const stopList = (stopsRes as { data?: unknown }).data ?? stopsRes
        const lineList = (linesRes as { data?: unknown }).data ?? linesRes
        const savedList = (savedRes as { data?: unknown }).data ?? savedRes
        setStops(Array.isArray(stopList) ? (stopList as StopSummary[]) : [])
        setLines(Array.isArray(lineList) ? (lineList as LineRow[]) : [])
        setSaved(Array.isArray(savedList) ? (savedList as SavedStopRow[]) : [])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[Nearby] load failed:', err)
        setError(
          t('nearby.error', {}, { defaultValue: 'Could not load the network. Please try again.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Derive stop → serving lines from each line's stop-code list.
  const linesByStopCode = new Map<string, LineRow[]>()
  for (const line of lines) {
    for (const code of line.stops ?? []) {
      const list = linesByStopCode.get(code) ?? []
      list.push(line)
      linesByStopCode.set(code, list)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('nearby.eyebrow', {}, { defaultValue: 'City transit' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            'leading-tight tracking-tight',
          )}
        >
          {t('nearby.title', {}, { defaultValue: 'Find your stop' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'nearby.subtitle',
            {},
            { defaultValue: 'Search by name or code, or browse every stop — interchanges first.' },
          )}
        </p>
      </header>

      <div className={cm.sp('mb', 8)}>
        <StopSearchCard variant="inline" />
      </div>

      {saved.length > 0 ? (
        <section className={cm.sp('mb', 8)} data-mol-id="nearby-saved">
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('nearby.savedHeading', {}, { defaultValue: 'Your saved stops' })}
            </h2>
            <Link
              to="/saved"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('nearby.manageSaved', {}, { defaultValue: 'Manage' })}
            </Link>
          </div>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 3))}>
            {saved.map((stop) => (
              <StopListItem
                key={stop.id}
                stop={{
                  code: stop.code,
                  name: stop.name,
                  hub: stop.hub,
                  lines: linesByStopCode.get(stop.code) ?? [],
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section data-mol-id="nearby-all-stops">
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('nearby.allStopsHeading', {}, { defaultValue: 'All stops' })}
        </h2>
        {error ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('nearby.loading', {}, { defaultValue: 'Loading stops…' })}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 3))}>
            {stops.map((stop) => (
              <StopListItem
                key={stop.code}
                stop={{ ...stop, lines: linesByStopCode.get(stop.code) ?? [] }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
