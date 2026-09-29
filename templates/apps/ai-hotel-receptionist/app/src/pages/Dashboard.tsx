import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDate, formatDuration, formatTime, languageLabel } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface DashboardPayload {
  today: string
  arrivals: ReservationRow[]
  departures: ReservationRow[]
  rooms: RoomRow[]
  status_board: Record<string, number>
  occupancy: { occupied_rooms: number; total_rooms: number; percent: number }
  recent_calls: Array<{
    id: string
    voice_agent_name: string | null
    detected_language: string | null
    started_at: string
    duration_seconds: number
    outcome: string | null
  }>
}

interface ReservationRow {
  id: string
  guest_name: string
  room_type_id: string
  check_in: string
  check_out: string
  guests: number
  status: string
  source: string
  confirmation_code: string
}

interface RoomRow {
  id: string
  number: string
  floor: number
  status: string
}

const STATUS_TONES: Record<string, string> = {
  vacant_clean: 'bg-success/10 text-success',
  occupied: 'bg-primary/10 text-primary',
  cleaning: 'bg-accent/15 text-accent-strong',
  out_of_order: 'bg-error/10 text-error',
}

/** Status tile icons — the design's bento glyph per room state. */
const STATUS_ICONS: Record<string, string> = {
  vacant_clean: 'meeting_room',
  occupied: 'hotel',
  cleaning: 'cleaning_services',
  out_of_order: 'build_circle',
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get('/api/dashboard')
        if (cancelled) return
        setData(unwrapSingle<DashboardPayload>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(
            t('dashboard.loadError', {}, { defaultValue: 'Failed to load today\u2019s board.' }),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading) {
    return (
      <p
        data-mol-id="dashboard-loading"
        className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  if (error || !data) {
    return (
      <p
        data-mol-id="dashboard-error"
        className={cm.cn(
          cm.sp('mx', 6),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-lg bg-error/10 text-error border border-error/30 inline-block',
        )}
      >
        {error}
      </p>
    )
  }

  const statusTiles = (['vacant_clean', 'occupied', 'cleaning', 'out_of_order'] as const).map(
    (status) => ({
      status,
      count: data.status_board[status] ?? 0,
    }),
  )

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Ledger hero — audit-console eyebrow, serif headline, dark action */}
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'border-b border-outline-variant/60 pb-6',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
            )}
          >
            <span className="text-secondary">
              {t('dashboard.eyebrow', {}, { defaultValue: 'Autonomous concierge & audit console' })}
            </span>
            <span className="text-on-surface-variant" aria-hidden="true">
              •
            </span>
            <span className="text-on-surface-variant">{formatDate(data.today)}</span>
          </p>
          <h1
            className={cm.cn('sb-serif mt-1 text-3xl font-normal tracking-tight text-primary')}
            data-mol-id="dashboard-heading"
          >
            {t('dashboard.heading', {}, { defaultValue: 'Today at the front desk' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              { date: formatDate(data.today) },
              { defaultValue: 'Arrivals, departures, and the room board for {{date}}.' },
            )}
          </p>
        </div>
        <Link
          to="/simulator"
          data-mol-id="dashboard-simulator-link"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors sb-card-shadow',
          )}
        >
          <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">headset_mic</span>
          </span>
          <span>
            {t('dashboard.openSimulator', {}, { defaultValue: 'Answer a simulated call' })}
          </span>
        </Link>
      </div>

      {/* Status tiles — the design's bento metric cards */}
      <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-2 sm:grid-cols-4 gap-4')}>
        {statusTiles.map((tile) => (
          <div
            key={tile.status}
            data-mol-id={'dashboard-tile-' + tile.status}
            className="sb-card-shadow rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4"
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'xs' }))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t(
                  'roomStatus.' + tile.status,
                  {},
                  { defaultValue: tile.status.replace(/_/g, ' ') },
                )}
              </p>
              <span
                className={cm.cn(
                  cm.sp('p', 2),
                  'flex h-8 w-8 items-center justify-center rounded bg-surface-container',
                  STATUS_TONES[tile.status] ?? 'bg-surface-container text-on-surface',
                )}
                aria-hidden="true"
              >
                <span className="sb-icon flex h-4 w-4 items-center justify-center">
                  <span className="material-symbols-outlined">
                    {STATUS_ICONS[tile.status] ?? 'meeting_room'}
                  </span>
                </span>
              </span>
            </div>
            <p className={cm.cn('sb-serif mt-2 text-3xl font-medium tracking-tight text-primary')}>
              {tile.count}
            </p>
          </div>
        ))}
      </div>

      {/* Occupancy */}
      <section
        data-mol-id="dashboard-occupancy"
        className={cm.cn(
          cm.sp('mt', 4),
          cm.sp('p', 6),
          'rounded-lg border border-outline-variant/60 bg-surface-container-lowest sb-card-shadow',
        )}
        aria-label={t('dashboard.occupancyLabel', {}, { defaultValue: 'Occupancy' })}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('lg'),
              'sb-serif font-medium text-primary',
            )}
          >
            <span
              className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">door_sliding</span>
            </span>
            {t('dashboard.occupancy', {}, { defaultValue: 'Occupancy' })}
          </h2>
          <p
            data-mol-id="dashboard-occupancy-value"
            className={cm.cn(cm.fontWeight('bold'), 'font-mono text-primary')}
          >
            {t(
              'dashboard.occupancyOf',
              {
                occupied: data.occupancy.occupied_rooms,
                total: data.occupancy.total_rooms,
                percent: data.occupancy.percent,
              },
              {
                defaultValue: '{{occupied}} of {{total}} rooms · {{percent}}%',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(cm.sp('mt', 3), 'h-1.5 rounded-full bg-surface-variant overflow-hidden')}
          role="progressbar"
          aria-valuenow={data.occupancy.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: Math.min(100, Math.max(0, data.occupancy.percent)) + '%' }}
          />
        </div>
      </section>

      <div className={cm.cn(cm.sp('mt', 4), 'grid grid-cols-1 lg:grid-cols-2 gap-4')}>
        {/* Arrivals */}
        <section
          data-mol-id="dashboard-arrivals"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-lg border border-outline-variant/60 bg-surface-container-lowest sb-card-shadow',
          )}
          aria-label={t('dashboard.arrivalsLabel', {}, { defaultValue: 'Today\u2019s arrivals' })}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('lg'),
              'sb-serif font-medium text-primary',
            )}
          >
            <span
              className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">luggage</span>
            </span>
            {t('dashboard.arrivals', {}, { defaultValue: 'Arrivals today' })} (
            {data.arrivals.length})
          </h2>
          <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'xs' }))}>
            {data.arrivals.length === 0 ? (
              <li className={cm.textSize('sm') + ' text-on-surface-variant'}>
                {t(
                  'dashboard.noArrivals',
                  {},
                  { defaultValue: 'No arrivals scheduled for today.' },
                )}
              </li>
            ) : (
              data.arrivals.map((r) => (
                <li
                  key={r.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded border border-outline-variant/40 bg-surface-bright',
                  )}
                >
                  <Link
                    to={'/reservations/' + r.id}
                    data-mol-id={'dashboard-arrival-' + r.confirmation_code}
                    className="-my-2 inline-block py-2 font-semibold text-primary hover:text-secondary hover:underline transition-colors"
                  >
                    {r.guest_name}
                  </Link>
                  <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                    {r.guests} {t('common.guestsShort', {}, { defaultValue: 'guests' })} ·{' '}
                    {r.confirmation_code}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Departures */}
        <section
          data-mol-id="dashboard-departures"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-lg border border-outline-variant/60 bg-surface-container-lowest sb-card-shadow',
          )}
          aria-label={t(
            'dashboard.departuresLabel',
            {},
            { defaultValue: 'Today\u2019s departures' },
          )}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('lg'),
              'sb-serif font-medium text-primary',
            )}
          >
            <span
              className="sb-icon flex h-5 w-5 items-center justify-center text-on-surface-variant"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">flight_takeoff</span>
            </span>
            {t('dashboard.departures', {}, { defaultValue: 'Departures today' })} (
            {data.departures.length})
          </h2>
          <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'xs' }))}>
            {data.departures.length === 0 ? (
              <li className={cm.textSize('sm') + ' text-on-surface-variant'}>
                {t(
                  'dashboard.noDepartures',
                  {},
                  { defaultValue: 'No departures scheduled for today.' },
                )}
              </li>
            ) : (
              data.departures.map((r) => (
                <li
                  key={r.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded border border-outline-variant/40 bg-surface-bright',
                  )}
                >
                  <Link
                    to={'/reservations/' + r.id}
                    data-mol-id={'dashboard-departure-' + r.confirmation_code}
                    className="-my-2 inline-block py-2 font-semibold text-primary hover:text-secondary hover:underline transition-colors"
                  >
                    {r.guest_name}
                  </Link>
                  <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                    {r.confirmation_code}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Room board */}
      <section
        data-mol-id="dashboard-room-board"
        className={cm.cn(
          cm.sp('mt', 4),
          cm.sp('p', 6),
          'rounded-lg border border-outline-variant/60 bg-surface-container-lowest sb-card-shadow',
        )}
        aria-label={t('dashboard.roomBoardLabel', {}, { defaultValue: 'Room status board' })}
      >
        <h2
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('lg'),
            'sb-serif font-medium text-primary',
          )}
        >
          <span
            className="sb-icon flex h-5 w-5 items-center justify-center text-on-surface-variant"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined">grid_view</span>
          </span>
          {t('dashboard.roomBoard', {}, { defaultValue: 'Room board' })}
        </h2>
        <ul
          className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'row', gap: 'xs', wrap: 'wrap' }))}
        >
          {data.rooms.map((room) => (
            <li key={room.id}>
              <Link
                to="/rooms"
                data-mol-id={'dashboard-room-' + room.number}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'inline-block rounded border border-outline-variant/40 font-mono',
                  STATUS_TONES[room.status] ?? 'bg-surface-container-low text-on-surface',
                )}
                title={room.status.replace(/_/g, ' ')}
              >
                {room.number}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent calls — the design's live call feed rail */}
      <section
        data-mol-id="dashboard-recent-calls"
        className={cm.cn(
          cm.sp('mt', 4),
          cm.sp('p', 6),
          'rounded-lg border border-outline-variant/60 bg-surface-container-lowest sb-card-shadow',
        )}
        aria-label={t('dashboard.recentCallsLabel', {}, { defaultValue: 'Recent calls' })}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('lg'),
              'sb-serif font-medium text-primary',
            )}
          >
            <span
              className={cm.cn(cm.flex({ align: 'center' }), 'h-2.5 w-2.5 shrink-0')}
              aria-hidden="true"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            {t('dashboard.recentCalls', {}, { defaultValue: 'Recent calls' })}
          </h2>
          <Link
            to="/calls"
            data-mol-id="dashboard-all-calls-link"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-secondary hover:text-primary transition-colors -my-2 inline-flex py-2',
            )}
          >
            {t('dashboard.viewAllCalls', {}, { defaultValue: 'View all calls' })}
            <span
              className="sb-icon flex h-3.5 w-3.5 items-center justify-center"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </Link>
        </div>
        <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
          {data.recent_calls.length === 0 ? (
            <li className={cm.textSize('sm') + ' text-on-surface-variant'}>
              {t(
                'dashboard.noCalls',
                {},
                { defaultValue: 'No calls yet — try the Call Simulator.' },
              )}
            </li>
          ) : (
            data.recent_calls.map((c) => (
              <li
                key={c.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded border border-outline-variant/40 bg-surface-container-low',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  {c.detected_language ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'rounded border border-outline-variant/50 bg-surface font-mono text-xs font-bold text-primary',
                      )}
                    >
                      {c.detected_language.toUpperCase()}
                    </span>
                  ) : null}
                  <Link
                    to={'/calls/' + c.id}
                    data-mol-id={'dashboard-call-' + c.id}
                    className="-my-2 inline-block py-2 font-semibold text-primary hover:text-secondary hover:underline transition-colors"
                  >
                    {c.voice_agent_name ??
                      t('common.voiceAgent', {}, { defaultValue: 'Voice agent' })}
                  </Link>
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                  {formatTime(c.started_at)} · {formatDuration(c.duration_seconds)} ·{' '}
                  {c.outcome ?? t('callOutcome.inProgress', {}, { defaultValue: 'in progress' })}
                </span>
                <span className="sr-only">{languageLabel(c.detected_language)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
