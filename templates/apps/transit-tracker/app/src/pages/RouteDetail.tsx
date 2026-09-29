import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LineBadge } from '../components/LineBadge.js'
import { LineMapSvg } from '../components/LineMapSvg.js'
import { formatHeadway } from '../lib/format.js'

interface LineRow {
  code: string
  name: string
  kind: 'metro' | 'bus' | 'tram'
  color: string
  polyline: Array<[number, number]>
}

interface StopRow {
  code: string
  name: string
  lat: number
  lng: number
  hub: boolean
  sequence: number
  offset_seconds_0: number
  offset_seconds_1: number
}

interface ScheduleRow {
  direction: 0 | 1
  first_departure: string
  last_departure: string
  headway_seconds: number
}

interface LineDetailResponse {
  line: LineRow
  stops: StopRow[]
  schedules: ScheduleRow[]
}

const KIND_LABELS: Record<LineRow['kind'], string> = {
  metro: 'Metro',
  tram: 'Tram',
  bus: 'Bus',
}

/**
 * Line page: the route diagram (static SVG — fictional city, no tiles, see
 * LineMapSvg), the ordered stop list linking to each board, and the service
 * window (first/last departure + frequency) per direction.
 */
export function RouteDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { code } = useParams<{ code: string }>()
  const lineCode = (code ?? '').toUpperCase()

  const [detail, setDetail] = useState<LineDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/network/lines/${encodeURIComponent(lineCode)}`)
      .then((res) => {
        if (cancelled) return
        const data = ((res as { data?: unknown }).data ?? res) as LineDetailResponse
        setDetail(data)
        void track({
          name: 'route.viewed',
          properties: { line_code: lineCode, kind: data?.line?.kind ?? '' },
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if ((err as { status?: number }).status === 404) setNotFound(true)
        console.error('[RouteDetail] line detail failed:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, lineCode, nonce])

  if (notFound) {
    return (
      <div
        className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 20), cm.textCenter, cm.mxAuto)}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('routeDetail.notFoundTitle', {}, { defaultValue: 'Line not found' })}
        </h1>
        <Link
          to="/nearby"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t('stopBoard.backToNearby', {}, { defaultValue: 'Back to all stops' })}
        </Link>
      </div>
    )
  }

  const schedule = (direction: 0 | 1): ScheduleRow | undefined =>
    detail?.schedules.find((s) => s.direction === direction)
  const firstSchedule = schedule(0)
  const terminus0 = detail?.stops[detail.stops.length - 1]
  const terminus1 = detail?.stops[0]

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {detail
              ? t(
                  `line.kind.${detail.line.kind}`,
                  {},
                  { defaultValue: KIND_LABELS[detail.line.kind] },
                )
              : ''}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              'leading-tight tracking-tight',
              cm.flex({ align: 'center', gap: 'sm' }),
            )}
          >
            {detail ? <LineBadge line={detail.line} /> : null}
            {detail?.line.name ?? lineCode}
          </h1>
        </div>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('routeDetail.loading', {}, { defaultValue: 'Loading line…' })}
        </p>
      ) : detail ? (
        <>
          <section className={cm.sp('mb', 8)} data-mol-id="line-map-section">
            <LineMapSvg color={detail.line.color} stops={detail.stops} />
          </section>

          <section
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4', cm.sp('mb', 8))}
            data-mol-id="line-schedules"
          >
            {([0, 1] as const).map((direction) => {
              const row = schedule(direction)
              return (
                <div
                  key={direction}
                  className={cm.cn(
                    cm.sp('p', 5),
                    'bg-surface rounded-2xl ring-1 ring-outline-variant/40',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('routeDetail.towards', {}, { defaultValue: 'Towards' })}{' '}
                    {(direction === 0 ? terminus0?.name : terminus1?.name) ?? ''}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 2),
                      'tabular-nums',
                    )}
                  >
                    {row ? `${row.first_departure} – ${row.last_departure}` : '—'}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {row
                      ? t(
                          'routeDetail.everyFrequency',
                          { freq: formatHeadway(row.headway_seconds) },
                          { defaultValue: 'every {{freq}}' },
                        )
                      : ''}
                  </p>
                </div>
              )
            })}
          </section>

          {/* Design's "Line Stringline & Rolling Stock Telematics" — the
              stringline diagram above plus schedule-derived fleet facts. */}
          <section data-mol-id="line-telematics" className={cm.sp('mb', 8)}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
              {t(
                'routeDetail.telematicsHeading',
                {},
                { defaultValue: 'Stringline & rolling stock telematics' },
              )}
            </h2>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-surface rounded-2xl ring-1 ring-outline-variant/40',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('routeDetail.telematics.stringline', {}, { defaultValue: 'Stringline' })}
                </p>
                <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                  {t(
                    'routeDetail.telematics.stopsCount',
                    { count: detail.stops.length },
                    { defaultValue: '{{count}} stations' },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'routeDetail.telematics.stringlineBody',
                    {},
                    {
                      defaultValue:
                        'The route diagram plots every stop in order along the line geometry.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-surface rounded-2xl ring-1 ring-outline-variant/40',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('routeDetail.telematics.headway', {}, { defaultValue: 'Headway control' })}
                </p>
                <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                  {firstSchedule ? formatHeadway(firstSchedule.headway_seconds) : '—'}
                </p>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'routeDetail.telematics.headwayBody',
                    {},
                    {
                      defaultValue:
                        'Automated headway control holds trains evenly spaced across the line.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-surface rounded-2xl ring-1 ring-outline-variant/40',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('routeDetail.telematics.rollingStock', {}, { defaultValue: 'Rolling stock' })}
                </p>
                <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                  {t(
                    `routeDetail.telematics.fleet.${detail.line.kind}`,
                    {},
                    {
                      defaultValue:
                        detail.line.kind === 'bus'
                          ? 'City buses'
                          : detail.line.kind === 'tram'
                            ? 'Tramsets'
                            : 'Trainsets',
                    },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'routeDetail.telematics.rollingStockBody',
                    {},
                    {
                      defaultValue:
                        'Vehicles report position through the open transponder feed — the board clock and the fleet clock are one and the same.',
                    },
                  )}
                </p>
              </div>
            </div>
          </section>

          <section data-mol-id="line-stop-list">
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
              {t('routeDetail.stopsHeading', {}, { defaultValue: 'Stops' })}
            </h2>
            <ol className={cm.flex({ direction: 'col', gap: 'sm' })}>
              {detail.stops.map((stop) => (
                <li key={stop.code}>
                  <Link
                    to={`/stops/${stop.code}`}
                    data-mol-id={`line-stop-link-${stop.code}`}
                    className={cm.cn(
                      'flex items-center gap-3',
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'bg-surface rounded-xl ring-1 ring-outline-variant/40 hover:ring-primary/50 transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(7),
                        cm.h(7),
                        cm.roundedFull,
                        'text-white text-xs font-bold tabular-nums shrink-0',
                      )}
                      style={{ backgroundColor: detail.line.color }}
                    >
                      {stop.sequence}
                    </span>
                    <span className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {stop.name}
                    </span>
                    {stop.hub ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest rounded-full px-2.5 py-0.5',
                        )}
                        style={{
                          backgroundColor: 'var(--color-hub-light)',
                          color: 'var(--color-hub)',
                        }}
                      >
                        {t('stop.hubChip', {}, { defaultValue: 'Interchange' })}
                      </span>
                    ) : null}
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'ml-auto text-on-surface-variant tabular-nums',
                      )}
                    >
                      +{Math.round(stop.offset_seconds_0 / 60)} min
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <div className={cm.cn(cm.sp('py', 12), cm.textCenter)}>
          <p className={'text-error'}>
            {t(
              'routeDetail.error',
              {},
              { defaultValue: 'Could not load this line. Please try again.' },
            )}
          </p>
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
      )}
    </div>
  )
}
