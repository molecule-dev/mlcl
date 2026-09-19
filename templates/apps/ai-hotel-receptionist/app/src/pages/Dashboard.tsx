import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDate, formatDuration, languageLabel } from '../lib/format.js'
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
  cleaning: 'bg-accent/15 text-on-tertiary',
  out_of_order: 'bg-error/10 text-error',
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
        const res = await http.get('/dashboard')
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
          'rounded-xl bg-error/10 text-error border border-error/30 inline-block',
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
      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' })}>
        <div>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
            data-mol-id="dashboard-heading"
          >
            {t('dashboard.heading', {}, { defaultValue: 'Today at the front desk' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
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
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg',
          )}
        >
          {t('dashboard.openSimulator', {}, { defaultValue: 'Answer a simulated call' })}
        </Link>
      </div>

      {/* Status tiles */}
      <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-2 sm:grid-cols-4 gap-4')}>
        {statusTiles.map((tile) => (
          <div
            key={tile.status}
            data-mol-id={'dashboard-tile-' + tile.status}
            className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface border border-outline-variant')}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('roomStatus.' + tile.status, {}, { defaultValue: tile.status.replace(/_/g, ' ') })}
            </p>
            <p className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
              {tile.count}
            </p>
          </div>
        ))}
      </div>

      {/* Occupancy */}
      <section
        data-mol-id="dashboard-occupancy"
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
        aria-label={t('dashboard.occupancyLabel', {}, { defaultValue: 'Occupancy' })}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('dashboard.occupancy', {}, { defaultValue: 'Occupancy' })}
          </h2>
          <p
            data-mol-id="dashboard-occupancy-value"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary')}
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
          className={cm.cn(
            cm.sp('mt', 3),
            'h-3 rounded-full bg-surface-container-high overflow-hidden',
          )}
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

      <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        {/* Arrivals */}
        <section
          data-mol-id="dashboard-arrivals"
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-outline-variant')}
          aria-label={t('dashboard.arrivalsLabel', {}, { defaultValue: 'Today\u2019s arrivals' })}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('dashboard.arrivals', {}, { defaultValue: 'Arrivals today' })} (
            {data.arrivals.length})
          </h2>
          <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
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
                <li key={r.id} className={cm.flex({ align: 'center', justify: 'between' })}>
                  <Link
                    to={'/reservations/' + r.id}
                    data-mol-id={'dashboard-arrival-' + r.confirmation_code}
                    className="font-semibold text-primary hover:underline"
                  >
                    {r.guest_name}
                  </Link>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-outline-variant')}
          aria-label={t(
            'dashboard.departuresLabel',
            {},
            { defaultValue: 'Today\u2019s departures' },
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('dashboard.departures', {}, { defaultValue: 'Departures today' })} (
            {data.departures.length})
          </h2>
          <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
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
                <li key={r.id} className={cm.flex({ align: 'center', justify: 'between' })}>
                  <Link
                    to={'/reservations/' + r.id}
                    data-mol-id={'dashboard-departure-' + r.confirmation_code}
                    className="font-semibold text-primary hover:underline"
                  >
                    {r.guest_name}
                  </Link>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
          cm.sp('mt', 6),
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
        aria-label={t('dashboard.roomBoardLabel', {}, { defaultValue: 'Room status board' })}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('dashboard.roomBoard', {}, { defaultValue: 'Room board' })}
        </h2>
        <ul
          className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'row', gap: 'sm', wrap: 'wrap' }))}
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
                  cm.fontWeight('bold'),
                  'rounded-xl border border-outline-variant',
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

      {/* Recent calls */}
      <section
        data-mol-id="dashboard-recent-calls"
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
        aria-label={t('dashboard.recentCallsLabel', {}, { defaultValue: 'Recent calls' })}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('dashboard.recentCalls', {}, { defaultValue: 'Recent calls' })}
          </h2>
          <Link
            to="/calls"
            data-mol-id="dashboard-all-calls-link"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('dashboard.viewAllCalls', {}, { defaultValue: 'View all calls' })}
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
              <li key={c.id} className={cm.flex({ align: 'center', justify: 'between' })}>
                <Link
                  to={'/calls/' + c.id}
                  data-mol-id={'dashboard-call-' + c.id}
                  className="font-semibold text-primary hover:underline"
                >
                  {c.voice_agent_name ??
                    t('common.voiceAgent', {}, { defaultValue: 'Voice agent' })}
                </Link>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {languageLabel(c.detected_language)} · {formatDuration(c.duration_seconds)} ·{' '}
                  {c.outcome ?? t('callOutcome.inProgress', {}, { defaultValue: 'in progress' })}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
