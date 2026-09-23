import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type DeviceListItem, DeviceStatusRow } from '../components/DeviceStatusRow.js'
import { EnergyMeterCard } from '../components/EnergyMeterCard.js'
import { HomeHeroCard } from '../components/HomeHeroCard.js'
import { type RoomSummary, RoomTriad } from '../components/RoomTriad.js'
import { unwrapList } from '../utils/httpUnpack.js'

interface DeviceStats {
  total?: number
  online?: number
  offline?: number
  on?: number
}

interface EnergyStats {
  today_kwh?: number
  today_cost?: number
  month_kwh?: number
  month_cost?: number
}

interface EnergyCurrent {
  total_watts?: number
  devices?: ReadonlyArray<{
    device_id: string
    device_name: string
    device_type?: string
    room?: string | null
    watts?: number
  }>
}

interface RoomRecord {
  id: string
  name: string
  icon?: string | null
}

interface DeviceRecord {
  id: string
  room?: string | null
  is_on?: boolean
  status?: string
}

interface EnergyReading {
  watts?: number
  recorded_at?: string
}

const ROOM_KIND_KEYWORDS: Array<{ kind: RoomSummary['kind']; keywords: ReadonlyArray<string> }> = [
  { kind: 'living', keywords: ['living', 'lounge', 'family'] },
  { kind: 'kitchen', keywords: ['kitchen', 'pantry', 'dining'] },
  { kind: 'bedroom', keywords: ['bedroom', 'bed ', 'master', 'nursery', 'guest'] },
  { kind: 'bath', keywords: ['bath', 'restroom'] },
  { kind: 'office', keywords: ['office', 'study', 'studio'] },
  { kind: 'outdoor', keywords: ['patio', 'garden', 'deck', 'porch', 'yard', 'garage'] },
]

function inferKind(name: string): RoomSummary['kind'] {
  const lower = name.toLowerCase()
  for (const entry of ROOM_KIND_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.kind
  }
  return 'living'
}

function unwrapStats<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null
  if ('data' in payload && (payload as { data?: unknown }).data) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export function Overview() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [deviceStats, setDeviceStats] = useState<DeviceStats>({})
  const [energyStats, setEnergyStats] = useState<EnergyStats>({})
  const [energyCurrent, setEnergyCurrent] = useState<EnergyCurrent>({ total_watts: 0, devices: [] })
  const [activeDevices, setActiveDevices] = useState<DeviceListItem[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [allDevices, setAllDevices] = useState<DeviceRecord[]>([])
  const [readings, setReadings] = useState<EnergyReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/iot-devices/stats/overview').catch(() => null),
      http.get('/api/energy/stats').catch(() => null),
      http.get('/api/energy/current').catch(() => null),
      http.get('/api/iot-devices?limit=8').catch(() => null),
      http.get('/api/rooms').catch(() => null),
      http.get('/api/iot-devices').catch(() => null),
      http.get('/api/energy/readings?limit=24').catch(() => null),
    ])
      .then(([d, e, c, devs, roomsResp, allDevs, readingsResp]) => {
        if (cancelled) return
        setDeviceStats(unwrapStats<DeviceStats>(d) || {})
        setEnergyStats(unwrapStats<EnergyStats>(e) || {})
        setEnergyCurrent(unwrapStats<EnergyCurrent>(c) || { total_watts: 0, devices: [] })
        setActiveDevices(unwrapList<DeviceListItem>(devs).slice(0, 6))
        setRooms(unwrapList<RoomRecord>(roomsResp))
        setAllDevices(unwrapList<DeviceRecord>(allDevs))
        setReadings(unwrapList<EnergyReading>(readingsResp))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('overview.loadError', {}, { defaultValue: 'Failed to load home overview.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Build per-room device counts from real rooms + devices.
  const roomSummaries: RoomSummary[] = rooms.slice(0, 6).map((r) => {
    const list = allDevices.filter((d) => (d.room ?? '').toLowerCase() === r.name.toLowerCase())
    return {
      id: r.id,
      name: r.name,
      kind: inferKind(r.name),
      devicesOn: list.filter((d) => d.is_on).length,
      devicesTotal: list.length,
      temperatureF: 70,
    }
  })

  // Build a real 24-point watt history from energy_readings.
  const history =
    readings.length > 0
      ? readings.slice(0, 24).map((r, i) => ({
          hour: `${i}:00`,
          watts: Number(r.watts || 0),
        }))
      : Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, watts: 0 }))

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }
  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('overview.loading', {}, { defaultValue: 'Tuning in to your home…' })}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('overview.eyebrow', {}, { defaultValue: 'Home' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'overview.subheading',
            {},
            { defaultValue: 'A live snapshot of every room, scene, and device.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <HomeHeroCard
          devicesOn={Number(deviceStats.on || 0)}
          devicesOnline={Number(deviceStats.online || 0)}
          totalDevices={Number(deviceStats.total || 0)}
          temperatureF={null}
          activeScene={null}
          history={history}
        />
        <EnergyMeterCard
          currentWatts={Number(energyCurrent.total_watts || 0)}
          todayKwh={Number(energyStats.today_kwh || 0)}
          todayCost={Number(energyStats.today_cost || 0)}
        />
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('overview.roomsHeading', {}, { defaultValue: 'Featured rooms' })}
          </h2>
          <Link
            to="/rooms"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline inline-flex items-center min-h-[36px]',
            )}
          >
            {t('overview.viewAllRooms', {}, { defaultValue: 'Every room →' })}
          </Link>
        </div>
        {roomSummaries.length > 0 ? (
          <RoomTriad rooms={roomSummaries} />
        ) : (
          <p
            data-testid="overview-no-rooms"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {t('overview.noRooms', {}, { defaultValue: 'No rooms yet — add one from /rooms.' })}
          </p>
        )}
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('overview.devicesHeading', {}, { defaultValue: 'Devices on right now' })}
          </h2>
          <Link
            to="/activity"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline inline-flex items-center min-h-[36px]',
            )}
          >
            {t('overview.viewActivity', {}, { defaultValue: 'Recent activity →' })}
          </Link>
        </div>
        {activeDevices.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {t(
              'overview.noDevices',
              {},
              { defaultValue: 'No devices reporting — pair your first one to get started.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {activeDevices.map((d) => (
              <DeviceStatusRow key={d.id} device={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
