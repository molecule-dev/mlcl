import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../utils/httpUnpack.js'

interface ActivityEvent {
  id: string
  icon: string
  title: string
  detail: string
  time: string
  category: 'device' | 'automation' | 'security' | 'scene' | 'energy'
}

interface DeviceEventRecord {
  id: string
  device_id?: string | null
  scene_id?: string | null
  event_type: string
  triggered_by?: string | null
  timestamp: string | null
}

interface DeviceRecord {
  id: string
  name: string
  type?: string | null
}

const CAT_COLOR: Record<ActivityEvent['category'], string> = {
  device: 'text-primary bg-primary/10',
  automation: 'text-tertiary bg-tertiary/10',
  security: 'text-warning bg-warning/10',
  scene: 'text-secondary bg-secondary/10',
  energy: 'text-success bg-success/10',
}

const TYPE_ICON: Record<string, string> = {
  light: 'lightbulb',
  thermostat: 'thermostat',
  lock: 'lock',
  camera: 'videocam',
  sensor: 'sensors',
  outlet: 'power',
}

function categorize(eventType: string): ActivityEvent['category'] {
  if (eventType === 'scene_activated' || eventType.startsWith('scene_')) return 'scene'
  if (eventType.includes('locked') || eventType.includes('motion') || eventType.includes('alarm')) {
    return 'security'
  }
  if (eventType.includes('automation') || eventType.includes('triggered')) return 'automation'
  if (eventType.includes('energy') || eventType.includes('power')) return 'energy'
  return 'device'
}

function formatRelative(timestamp: string | null): string {
  if (!timestamp) return ''
  const then = new Date(timestamp).getTime()
  const now = Date.now()
  const diffMs = now - then
  if (Number.isNaN(then)) return ''
  if (diffMs < 60_000) return 'Just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return `${Math.floor(diffMs / 86_400_000)}d ago`
}

function eventTitle(event: DeviceEventRecord, devicesById: Map<string, DeviceRecord>): string {
  const deviceName = event.device_id ? devicesById.get(event.device_id)?.name : null
  switch (event.event_type) {
    case 'turned_on':
      return deviceName ? `${deviceName} turned on` : 'Device turned on'
    case 'turned_off':
      return deviceName ? `${deviceName} turned off` : 'Device turned off'
    case 'property_changed':
      return deviceName ? `${deviceName} updated` : 'Device updated'
    default:
      return event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

function eventDetail(event: DeviceEventRecord): string {
  const by = event.triggered_by ? `Triggered by ${event.triggered_by}` : ''
  return by
}

export function Activity() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<DeviceEventRecord[] | null>(null)
  const [devicesById, setDevicesById] = useState<Map<string, DeviceRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/activity').catch((err) => {
        throw err
      }),
      http.get('/api/iot-devices').catch(() => null),
    ])
      .then(([activityPayload, devicesPayload]) => {
        if (cancelled) return
        const list = unwrapList<DeviceEventRecord>(activityPayload)
        const devicesList = unwrapList<DeviceRecord>(devicesPayload)
        setDevicesById(new Map(devicesList.map((d) => [d.id, d])))
        setEvents(list)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('activity.loadError', {}, { defaultValue: 'Could not load activity feed.' }),
          )
          setEvents(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visibleEvents: ActivityEvent[] = useMemo(() => {
    if (events === null) return []
    if (events.length === 0) return []
    return events.map((ev) => ({
      id: String(ev.id),
      icon: ev.device_id
        ? TYPE_ICON[devicesById.get(ev.device_id)?.type || ''] || 'devices'
        : 'history',
      title: eventTitle(ev, devicesById),
      detail: eventDetail(ev),
      time: formatRelative(ev.timestamp),
      category: categorize(ev.event_type),
    }))
  }, [devicesById, events])

  const showEmptyState = events !== null && events.length === 0

  return (
    <div
      data-testid="activity-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('activity.eyebrow', {}, { defaultValue: 'Timeline' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.activity', {}, { defaultValue: 'Activity' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'activity.subheading',
            {},
            {
              defaultValue: 'Every device, automation, and security event in chronological order.',
            },
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

      {loading && events === null ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
        </p>
      ) : null}

      {showEmptyState ? (
        <p
          data-testid="activity-empty"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t(
            'activity.empty',
            {},
            { defaultValue: 'No activity yet — flip a device or activate a scene.' },
          )}
        </p>
      ) : (
        <section
          data-testid="activity-list"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          {visibleEvents.map((e) => (
            <div
              key={e.id}
              data-testid="activity-item"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('p', 4),
                'bg-surface-container-lowest rounded-2xl hover:bg-surface-container-low transition-all',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  CAT_COLOR[e.category],
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">{e.icon}</span>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>{e.title}</p>
                {e.detail ? (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{e.detail}</p>
                ) : null}
              </div>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant tabular-nums',
                )}
              >
                {e.time}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
