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

const STATUS_TONES: Record<string, string> = {
  vacant_clean: 'bg-success/10 text-success',
  occupied: 'bg-primary/10 text-primary',
  cleaning: 'bg-accent/15 text-accent-strong',
  out_of_order: 'bg-error/10 text-error',
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

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))} data-mol-id="rooms-heading">
        {t('roomsRates.heading', {}, { defaultValue: 'Rooms & Rates' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
        {t(
          'roomsRates.subheading',
          {},
          {
            defaultValue:
              'Room types, the physical room board, and the rate plans that price them.',
          },
        )}
      </p>

      {error ? (
        <p
          data-mol-id="rooms-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      {/* Room types */}
      <section
        className={cm.cn(
          cm.sp('mt', 6),
          'rounded-2xl bg-surface border border-outline-variant overflow-hidden',
        )}
        aria-label={t('roomsRates.roomTypesLabel', {}, { defaultValue: 'Room types' })}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('p', 4))}>
          {t('roomsRates.roomTypes', {}, { defaultValue: 'Room types' })}
        </h2>
        {/* Horizontal scroll on narrow screens — keeps the section's rounded
            clipping from cutting the table off. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                <th className={cm.sp('p', 4)} scope="col">
                  {t('roomsRates.type', {}, { defaultValue: 'Type' })}
                </th>
                <th className={cm.sp('p', 4)} scope="col">
                  {t('roomsRates.occupancy', {}, { defaultValue: 'Occupancy' })}
                </th>
                <th className={cm.sp('p', 4)} scope="col">
                  {t('roomsRates.baseRate', {}, { defaultValue: 'Base rate' })}
                </th>
                <th className={cm.sp('p', 4)} scope="col">
                  {t('roomsRates.units', {}, { defaultValue: 'Units' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((rt) => (
                <tr key={rt.id} className="border-b border-outline-variant/50 last:border-0">
                  <td className={cm.sp('p', 4)}>
                    <span data-mol-id={'room-type-' + rt.id} className="font-semibold">
                      {rt.name}
                    </span>
                    {rt.description ? (
                      <span
                        className={cm.cn('block', cm.textSize('xs'), 'text-on-surface-variant')}
                      >
                        {rt.description}
                      </span>
                    ) : null}
                  </td>
                  <td className={cm.sp('p', 4)}>
                    {t(
                      'roomsRates.sleeps',
                      { count: rt.occupancy },
                      { defaultValue: 'sleeps {{count}}' },
                    )}
                  </td>
                  <td className={cm.sp('p', 4)}>
                    {formatCents(rt.base_rate_cents)}
                    {t('common.perNight', {}, { defaultValue: '/night' })}
                  </td>
                  <td className={cm.sp('p', 4)}>
                    {rooms.filter((r) => r.room_type_id === rt.id).length}
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
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
        aria-label={t('roomsRates.roomBoardLabel', {}, { defaultValue: 'Room board' })}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('roomsRates.roomBoard', {}, { defaultValue: 'Room board' })}
        </h2>
        <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
          {rooms.map((room) => (
            <li
              key={room.id}
              data-mol-id={'room-row-' + room.number}
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl border border-outline-variant',
                cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
              )}
            >
              <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span className={cm.fontWeight('bold')}>{room.number}</span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'roomsRates.floor',
                    { floor: room.floor },
                    { defaultValue: 'floor {{floor}}' },
                  )}{' '}
                  · {typeName(room.room_type_id)}
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
                    'rounded-lg border border-outline-variant',
                    STATUS_TONES[room.status] ?? '',
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
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
        aria-label={t('roomsRates.ratePlansLabel', {}, { defaultValue: 'Rate plans' })}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('roomsRates.ratePlans', {}, { defaultValue: 'Rate plans' })}
        </h2>
        <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}>
          {ratePlans.map((plan) => (
            <li
              key={plan.id}
              data-mol-id={'rate-plan-' + plan.id}
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl border border-outline-variant',
                cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
              )}
            >
              <span>
                <span className={cm.fontWeight('bold')}>{plan.name}</span>
                <span
                  className={cm.cn(cm.sp('ml', 2), cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {typeName(plan.room_type_id)}
                </span>
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'roomsRates.weekdayWeekend',
                  {
                    weekday: plan.weekday_adjustment_percent,
                    weekend: plan.weekend_adjustment_percent,
                  },
                  { defaultValue: 'weekday {{weekday}}% · weekend {{weekend}}%' },
                )}
                {plan.seasonal_override_cents !== null ? (
                  <>
                    {' · '}
                    {t(
                      'roomsRates.seasonal',
                      {
                        amount: formatCents(plan.seasonal_override_cents),
                        start: plan.seasonal_start ?? '',
                        end: plan.seasonal_end ?? '',
                      },
                      { defaultValue: '{{amount}}/night {{start}} → {{end}}' },
                    )}
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
