import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface RoomTypeRow {
  id: string
  name: string
  description: string | null
  occupancy: number
  base_rate_cents: number
}

interface RoomRow {
  id: string
  number: string
  floor: number
  room_type_id: string
  status: string
}

interface RatePlanRow {
  id: string
  name: string
  room_type_id: string
  weekday_adjustment_percent: number
  weekend_adjustment_percent: number
  seasonal_override_cents: number | null
  seasonal_start: string | null
  seasonal_end: string | null
  active: boolean
}

const ROOM_STATUSES = ['vacant_clean', 'occupied', 'cleaning', 'out_of_order'] as const

/** Room-board status tones — the design's chip grammar on the select. */
const STATUS_TONES: Record<string, string> = {
  vacant_clean: 'bg-tertiary-fixed/40 border-tertiary-fixed text-on-tertiary-fixed-variant',
  occupied: 'bg-secondary/10 border-secondary/30 text-secondary',
  cleaning: 'bg-accent/15 border-accent/30 text-accent-strong',
  out_of_order: 'bg-error/10 border-error/30 text-error',
}

export function RoomsRates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([])
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [ratePlans, setRatePlans] = useState<RatePlanRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [typesRes, roomsRes, plansRes] = await Promise.all([
        http.get('/api/room-types'),
        http.get('/api/rooms'),
        http.get('/api/rate-plans'),
      ])
      setRoomTypes(unwrapList<RoomTypeRow>(typesRes))
      setRooms(unwrapList<RoomRow>(roomsRes))
      setRatePlans(unwrapList<RatePlanRow>(plansRes))
      setError(null)
    } catch (_e) {
      setError(t('roomsRates.loadError', {}, { defaultValue: 'Failed to load rooms and rates.' }))
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const setRoomStatus = async (roomId: string, status: string) => {
    try {
      await http.patch('/api/rooms/' + roomId, { status })
      void track({ name: 'room.status_updated', properties: { room_id: roomId, status } })
      await load()
    } catch (_e) {
      setError(
        t('roomsRates.statusError', {}, { defaultValue: 'Could not update the room status.' }),
      )
    }
  }

  const typeName = (id: string): string =>
    roomTypes.find((rt) => rt.id === id)?.name ??
    t('common.roomType', {}, { defaultValue: 'Room type' })

  /** Section card header — serif title + gold icon tile, the design's pattern. */
  const sectionTitle = (icon: string, text: string) => (
    <h2
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        'sb-serif text-lg font-medium text-primary',
      )}
    >
      <span
        className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      {text}
    </h2>
  )

  const thClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'uppercase tracking-wider',
  )
  const tdClass = cm.cn(cm.sp('px', 4), cm.sp('py', 4))

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Header strip — eyebrow ledger trail, serif headline */}
      <div className="border-b border-outline-variant/60 pb-6">
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          <span>
            {t('roomsRates.eyebrow', {}, { defaultValue: 'Switchboard autonomous ledger' })}
          </span>
          <span className="sb-icon flex h-3 w-3 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">chevron_right</span>
          </span>
          <span className="text-secondary">
            {t('roomsRates.eyebrowSegment', {}, { defaultValue: 'Rooms & inventory' })}
          </span>
        </p>
        <h1
          className={cm.cn('sb-serif mt-1 text-3xl font-normal tracking-tight text-primary')}
          data-mol-id="rooms-heading"
        >
          {t('roomsRates.heading', {}, { defaultValue: 'Rooms & Rates' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'roomsRates.subheading',
            {},
            {
              defaultValue:
                'Room types, the physical room board, and the rate plans that price them.',
            },
          )}
        </p>
      </div>

      {error ? (
        <p
          data-mol-id="rooms-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      {/* Room categories */}
      <section
        className={cm.cn(
          cm.sp('mt', 6),
          'sb-card-shadow overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest',
        )}
        aria-label={t('roomsRates.roomTypesLabel', {}, { defaultValue: 'Room types' })}
      >
        <div className={cm.cn(cm.sp('p', 4), cm.sp('pb', 2))}>
          {sectionTitle('king_bed', t('roomsRates.roomTypes', {}, { defaultValue: 'Room types' }))}
        </div>
        {/* Horizontal scroll on narrow screens — keeps the section's rounded
            clipping from cutting the table off. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-outline-variant/40 bg-surface-container-low/70 text-left text-on-surface-variant">
                <th className={thClass} scope="col">
                  {t('roomsRates.type', {}, { defaultValue: 'Type' })}
                </th>
                <th className={thClass} scope="col">
                  {t('roomsRates.occupancy', {}, { defaultValue: 'Occupancy' })}
                </th>
                <th className={thClass} scope="col">
                  {t('roomsRates.baseRate', {}, { defaultValue: 'Base rate' })}
                </th>
                <th className={thClass} scope="col">
                  {t('roomsRates.units', {}, { defaultValue: 'Units' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {roomTypes.map((rt) => (
                <tr
                  key={rt.id}
                  className="bg-surface/80 transition-colors hover:bg-surface-container-low/60"
                >
                  <td className={tdClass}>
                    <span
                      data-mol-id={'room-type-' + rt.id}
                      className={cm.fontWeight('semibold') + ' text-primary'}
                    >
                      {rt.name}
                    </span>
                    {rt.description ? (
                      <span
                        className={cm.cn(
                          'block text-on-surface-variant',
                          cm.sp('mt', 0.5),
                          cm.textSize('xs'),
                        )}
                      >
                        {rt.description}
                      </span>
                    ) : null}
                  </td>
                  <td className={tdClass}>
                    {t(
                      'roomsRates.sleeps',
                      { count: rt.occupancy },
                      { defaultValue: 'sleeps {{count}}' },
                    )}
                  </td>
                  <td className={cnRate(tdClass)}>
                    <span className={cm.fontWeight('semibold') + ' text-primary'}>
                      {formatCents(rt.base_rate_cents)}
                    </span>
                    <span className="text-on-surface-variant">
                      {t('common.perNight', {}, { defaultValue: '/night' })}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span
                      className={cnUnitCount(rooms.filter((r) => r.room_type_id === rt.id).length)}
                    >
                      {rooms.filter((r) => r.room_type_id === rt.id).length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Room board with inline status change */}
      <section
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 5),
          'sb-card-shadow rounded-lg border border-outline-variant/50 bg-surface-container-lowest',
        )}
        aria-label={t('roomsRates.roomBoardLabel', {}, { defaultValue: 'Room board' })}
      >
        {sectionTitle(
          'meeting_room',
          t('roomsRates.roomBoard', {}, { defaultValue: 'Room board' }),
        )}
        <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'sm' }))}>
          {rooms.map((room) => (
            <li
              key={room.id}
              data-mol-id={'room-row-' + room.number}
              className={cm.cn(
                cm.sp('p', 3),
                cm.sp('px', 4),
                'rounded-lg border border-outline-variant/50 bg-surface-container-lowest transition-colors hover:border-outline-variant',
                cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
              )}
            >
              <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-8 w-14 shrink-0 rounded border border-outline-variant/60 bg-surface-container-high font-mono text-primary',
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                  )}
                >
                  {room.number}
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'roomsRates.floor',
                    { floor: room.floor },
                    { defaultValue: 'floor {{floor}}' },
                  )}{' '}
                  · <span className="text-primary">{typeName(room.room_type_id)}</span>
                </span>
              </span>
              <label className={cm.flex({ align: 'center', gap: 'xs' })}>
                <span className="sr-only">
                  {t(
                    'roomsRates.statusFor',
                    { number: room.number },
                    { defaultValue: 'Status for room {{number}}' },
                  )}
                </span>
                <select
                  value={room.status}
                  onChange={(e) => void setRoomStatus(room.id, e.target.value)}
                  data-mol-id={'room-status-' + room.number}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded border',
                    STATUS_TONES[room.status] ?? 'border-outline-variant',
                  )}
                >
                  {ROOM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t('roomStatus.' + s, {}, { defaultValue: s.replace(/_/g, ' ') })}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Rate plans */}
      <section
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 5),
          'sb-card-shadow rounded-lg border border-outline-variant/50 bg-surface-container-lowest',
        )}
        aria-label={t('roomsRates.ratePlansLabel', {}, { defaultValue: 'Rate plans' })}
      >
        {sectionTitle('payments', t('roomsRates.ratePlans', {}, { defaultValue: 'Rate plans' }))}
        <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'sm' }))}>
          {ratePlans.map((plan) => (
            <li
              key={plan.id}
              data-mol-id={'rate-plan-' + plan.id}
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg border border-outline-variant/50 bg-surface-container-lowest transition-colors hover:border-outline-variant',
                cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
              )}
            >
              <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-lg border border-outline-variant/60 bg-surface-container-high text-secondary',
                  )}
                >
                  <span className="sb-icon flex h-5 w-5 items-center justify-center">
                    <span className="material-symbols-outlined">sell</span>
                  </span>
                </span>
                <span>
                  <span className={cm.fontWeight('semibold') + ' text-primary'}>{plan.name}</span>
                  <span
                    className={cm.cn(
                      'block text-on-surface-variant',
                      cm.sp('mt', 0.5),
                      cm.textSize('xs'),
                    )}
                  >
                    {typeName(plan.room_type_id)}
                  </span>
                </span>
              </span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                <span
                  className={cnPlanAdjustment(
                    plan.weekday_adjustment_percent,
                    plan.weekend_adjustment_percent,
                  )}
                >
                  {t(
                    'roomsRates.weekdayWeekend',
                    {
                      weekday: plan.weekday_adjustment_percent,
                      weekend: plan.weekend_adjustment_percent,
                    },
                    { defaultValue: 'weekday {{weekday}}% · weekend {{weekend}}%' },
                  )}
                </span>
                {plan.seasonal_override_cents !== null ? (
                  <span className="rounded border border-secondary/30 bg-secondary/10 px-2 py-1 text-secondary">
                    {t(
                      'roomsRates.seasonal',
                      {
                        amount: formatCents(plan.seasonal_override_cents),
                        start: plan.seasonal_start ?? '',
                        end: plan.seasonal_end ?? '',
                      },
                      { defaultValue: '{{amount}}/night {{start}} → {{end}}' },
                    )}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )

  /** Local helpers kept below the JSX so the section list reads first. */
  function cnRate(base: string): string {
    return cm.cn(base, 'whitespace-nowrap')
  }
  function cnUnitCount(count: number): string {
    return cm.cn(
      cm.sp('px', 2),
      cm.sp('py', 0.5),
      cm.textSize('xs'),
      cm.fontWeight('semibold'),
      'rounded border',
      count > 0
        ? 'border-tertiary-fixed bg-tertiary-fixed/40 text-on-tertiary-fixed-variant'
        : 'border-outline-variant bg-surface-container text-on-surface-variant',
    )
  }
  function cnPlanAdjustment(weekday: number, weekend: number): string {
    const neutral = weekday === 0 && weekend === 0
    return cm.cn(
      'rounded border px-2 py-1',
      neutral
        ? 'border-outline-variant/60 bg-surface-container text-on-surface-variant'
        : 'border-outline-variant/60 bg-surface-container-high text-primary',
    )
  }
}
