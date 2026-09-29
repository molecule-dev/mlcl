import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LineBadge } from '../components/LineBadge.js'
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

/** Walk-buffer bands used by the departure-alarm math (design's radar card). */
const WALK_BUFFERS = [
  { minutes: 10, meters: 800, zone: 'comfortable', zoneDefault: 'Comfortable pace' },
  { minutes: 5, meters: 400, zone: 'brisk', zoneDefault: 'Brisk pace' },
  { minutes: 2, meters: 160, zone: 'door', zoneDefault: 'Door buffer' },
] as const

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
  const [nonce, setNonce] = useState(0)

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
  }, [http, t, nonce])

  // Derive stop → serving lines from each line's stop-code list.
  const linesByStopCode = new Map<string, LineRow[]>()
  for (const line of lines) {
    for (const code of line.stops ?? []) {
      const list = linesByStopCode.get(code) ?? []
      list.push(line)
      linesByStopCode.set(code, list)
    }
  }

  // The walk-buffer card anchors on the nearest interchange — the stop list
  // ranks interchanges first, so the first hub is the city-center anchor.
  const nearestHub = stops.find((stop) => stop.hub) ?? null

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
              {t('nearby.savedHeading', {}, { defaultValue: 'Pinned & saved commuter stops' })}
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
          <div className={cm.cn(cm.sp('py', 8), cm.textCenter)}>
            <p className={'text-error'}>{error}</p>
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className={cm.cn(
                cm.sp('mt', 3),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg text-primary hover:bg-primary/10 transition-colors',
              )}
            >
              {t('common.retry', {}, { defaultValue: 'Retry' })}
            </button>
          </div>
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

      {/* Design's "Live Radar & Walking Buffer" — how the walk-window math
          works, anchored on the rider's nearest interchange. */}
      <section data-mol-id="nearby-walk-buffer" className={cm.sp('mt', 10)}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('nearby.radarHeading', {}, { defaultValue: 'Live radar & walking buffer' })}
        </h2>
        <div
          className={cm.cn(
            cm.sp('p', 5),
            cm.sp('mt', 3),
            'bg-surface rounded-2xl ring-1 ring-outline-variant/40',
            cm.flex({ direction: 'col', gap: 'md' }),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-xl">directions_walk</span>
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {nearestHub
                ? t(
                    'nearby.radarBody',
                    { stop: nearestHub.name },
                    {
                      defaultValue:
                        'Boards size your departure alarm to the walk to {{stop}} — when the buffer tightens, the countdown says so before you leave.',
                    },
                  )
                : t(
                    'nearby.radarBodyEmpty',
                    {},
                    {
                      defaultValue:
                        'Boards size your departure alarm to the walk to your interchange — when the buffer tightens, the countdown says so before you leave.',
                    },
                  )}
            </p>
          </div>
          <ul className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
            {WALK_BUFFERS.map((buffer) => (
              <li
                key={buffer.minutes}
                data-mol-id={`nearby-walk-buffer-${buffer.minutes}min`}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-xl bg-surface-container-low ring-1 ring-outline-variant/40 tabular-nums',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t(
                    'nearby.walkBufferChip',
                    { minutes: buffer.minutes, meters: buffer.meters },
                    { defaultValue: '{{minutes}} min · {{meters}} m' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), cm.sp('ml', 2), 'text-on-surface-variant')}
                >
                  {t(
                    `nearby.walkBufferZone.${buffer.zone}`,
                    {},
                    { defaultValue: buffer.zoneDefault },
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Design's "Network Punctuality & Health" — every line's schedule
          health from the same /api/network/lines load the stop list uses. */}
      <section data-mol-id="nearby-network-health" className={cm.sp('mt', 10)}>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('nearby.healthHeading', {}, { defaultValue: 'Network punctuality & health' })}
          </h2>
          <Link
            to="/alerts"
            data-mol-id="nearby-health-alerts-link"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('nearby.healthAlertsLink', {}, { defaultValue: 'Service alerts' })}
          </Link>
        </div>
        {error || loading ? null : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 3))}>
            {lines.map((line) => (
              <li
                key={line.code}
                data-mol-id={`nearby-health-${line.code}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl ring-1 ring-outline-variant/40',
                )}
              >
                <LineBadge line={line} size="sm" />
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {line.name}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'ml-auto inline-flex items-center gap-1.5 uppercase tracking-widest',
                  )}
                  style={{ color: 'var(--color-live)' }}
                >
                  <span
                    className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull)}
                    style={{ backgroundColor: 'var(--color-live)' }}
                    aria-hidden="true"
                  />
                  {t('nearby.healthNormal', {}, { defaultValue: 'Normal service' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
