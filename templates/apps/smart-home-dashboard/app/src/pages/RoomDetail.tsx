import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type DeviceListItem, DeviceStatusRow } from '../components/DeviceStatusRow.js'
import { unwrapList, unwrapSingle } from '../utils/httpUnpack.js'

interface RoomRecord {
  id: string
  name: string
  icon?: string | null
  floor?: number | null
  area_sqft?: number | null
}

interface DeviceRecord {
  id: string
  name: string
  type: string
  room?: string | null
  status?: string
  is_on?: boolean
  updated_at?: string | null
  properties?: Record<string, unknown> | string | null
}

function parseProperties(props: DeviceRecord['properties']): Record<string, unknown> {
  if (!props) return {}
  if (typeof props === 'string') {
    try {
      return JSON.parse(props) as Record<string, unknown>
    } catch (_error) {
      // intentional noop — invalid JSON falls back to empty properties object
      return {}
    }
  }
  return props
}

function deviceWatts(device: DeviceRecord): number | null {
  const props = parseProperties(device.properties)
  const raw = props.watts ?? props.power ?? null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

export function RoomDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [room, setRoom] = useState<RoomRecord | null>(null)
  const [devices, setDevices] = useState<DeviceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([http.get(`/api/rooms/${id}`), http.get('/api/iot-devices').catch(() => null)])
      .then(([roomPayload, devicesPayload]) => {
        if (cancelled) return
        const fetchedRoom = unwrapSingle<RoomRecord>(roomPayload)
        setRoom(fetchedRoom)
        const allDevices = unwrapList<DeviceRecord>(devicesPayload)
        const filtered = fetchedRoom?.name
          ? allDevices.filter(
              (d) => (d.room || '').toLowerCase() === fetchedRoom.name.toLowerCase(),
            )
          : []
        setDevices(filtered)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('roomDetail.loadError', {}, { defaultValue: 'Failed to load room.' }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleToggle = useCallback(
    async (deviceId: string) => {
      setToggling(deviceId)
      const previous = devices.find((d) => d.id === deviceId)
      if (!previous) {
        setToggling(null)
        return
      }
      setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, is_on: !d.is_on } : d)))
      try {
        await http.post(`/api/iot-devices/${deviceId}/toggle`, {})
      } catch (error) {
        logError('roomDetail.handleToggle', error)
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, is_on: previous.is_on } : d)),
        )
      } finally {
        setToggling(null)
      }
    },
    [devices, http],
  )

  const roomName =
    room?.name ||
    (id
      ? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : t('roomDetail.unnamed', {}, { defaultValue: 'Room' }))

  const totalWatts = devices.reduce((sum, d) => sum + (deviceWatts(d) ?? 0), 0)
  const onCount = devices.filter((d) => d.is_on).length

  const deviceItems: DeviceListItem[] = devices.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    room: d.room ?? null,
    status: d.status ?? 'offline',
    is_on: Boolean(d.is_on),
    watts: deviceWatts(d),
    updated_at: d.updated_at ?? null,
  }))

  return (
    <div
      data-testid="room-detail"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <Link
          to="/rooms"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
            chevron_left
          </span>
          {t('roomDetail.back', {}, { defaultValue: 'All rooms' })}
        </Link>
        <h1
          data-testid="room-detail-name"
          className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}
        >
          {roomName}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'roomDetail.subheading',
            {},
            { defaultValue: 'Every device in this room with live state and per-device controls.' },
          )}
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'bg-warning-container text-on-warning-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 8),
          'bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden min-h-[200px]',
        )}
      >
        <div className={cm.cn('relative z-10')}>
          <p
            className={cm.cn(
              'font-bold text-[11px] uppercase tracking-widest text-primary-fixed/80 mb-2',
            )}
          >
            {t('roomDetail.envLabel', {}, { defaultValue: 'Snapshot' })}
          </p>
          <div className={cm.flex({ align: 'baseline', gap: 'lg' })}>
            <div>
              <span
                data-testid="room-on-count"
                className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
              >
                {onCount}
              </span>
              <span className={cm.cn('text-2xl ml-1 opacity-80')}>/{devices.length}</span>
              <p className={cm.cn('mt-1 text-xs uppercase tracking-widest opacity-70')}>
                {t('roomDetail.onLabel', {}, { defaultValue: 'Devices on' })}
              </p>
            </div>
            <div>
              <span
                data-testid="room-watts"
                className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
              >
                {Math.round(totalWatts)}
              </span>
              <span className={cm.cn('text-2xl ml-1 opacity-80')}>W</span>
              <p className={cm.cn('mt-1 text-xs uppercase tracking-widest opacity-70')}>
                {t('roomDetail.drawLabel', {}, { defaultValue: 'Power draw' })}
              </p>
            </div>
            {room?.area_sqft ? (
              <div>
                <span className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}>
                  {room.area_sqft}
                </span>
                <span className={cm.cn('text-2xl ml-1 opacity-80')}>ft²</span>
                <p className={cm.cn('mt-1 text-xs uppercase tracking-widest opacity-70')}>
                  {t('roomDetail.areaLabel', {}, { defaultValue: 'Area' })}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('roomDetail.devicesHeading', {}, { defaultValue: 'Devices in this room' })}
        </h2>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 6), cm.textCenter, 'text-on-surface-variant')}>
            {t('roomDetail.loading', {}, { defaultValue: 'Loading devices…' })}
          </p>
        ) : deviceItems.length === 0 ? (
          <p
            data-testid="room-no-devices"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {t(
              'roomDetail.noDevices',
              { room: roomName },
              { defaultValue: 'No devices in {{room}} yet.' },
            )}
          </p>
        ) : (
          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
            data-testid="room-devices"
          >
            {deviceItems.map((d) => (
              <DeviceStatusRow
                key={d.id}
                device={d}
                onToggle={toggling === d.id ? undefined : handleToggle}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
