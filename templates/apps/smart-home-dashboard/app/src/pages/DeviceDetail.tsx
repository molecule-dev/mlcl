import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface DeviceRecord {
  id: string
  name: string
  type: string
  room?: string | null
  status?: string
  is_on?: boolean
  manufacturer?: string | null
  model?: string | null
  firmware_version?: string | null
  properties?: Record<string, unknown> | string | null
  created_at?: string
  updated_at?: string
}

function unwrapDevice(payload: unknown): DeviceRecord | null {
  if (!payload || typeof payload !== 'object') return null
  if ('id' in payload) return payload as DeviceRecord
  if ('data' in payload && (payload as { data?: unknown }).data) {
    const inner = (payload as { data: unknown }).data
    if (inner && typeof inner === 'object' && 'id' in inner) return inner as DeviceRecord
  }
  return null
}

function readProperties(value: DeviceRecord['properties']): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch (_error) {
      // intentional noop — invalid JSON falls back to empty properties object
      return {}
    }
  }
  return value
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}

export function DeviceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [device, setDevice] = useState<DeviceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const payload = await http.get(`/api/iot-devices/${id}`)
      const next = unwrapDevice(payload)
      if (!next) {
        setError(t('deviceDetail.notFound', {}, { defaultValue: 'Device not found.' }))
      }
      setDevice(next)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('deviceDetail.loadError', {}, { defaultValue: 'Failed to load device.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = useCallback(async () => {
    if (!id || !device) return
    setToggling(true)
    try {
      const payload = await http.post(`/api/iot-devices/${id}/toggle`, {})
      const updated = unwrapDevice(payload)
      if (updated) {
        setDevice(updated)
      } else {
        await load()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('deviceDetail.toggleError', {}, { defaultValue: 'Toggle failed.' }),
      )
    } finally {
      setToggling(false)
    }
  }, [device, http, id, load, t])

  const isOn = Boolean(device?.is_on)
  const properties = readProperties(device?.properties)
  const propertyEntries = Object.entries(properties)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
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
          {t('settings.devices', {}, { defaultValue: 'Devices' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {device?.name || t('deviceDetail.unnamed', {}, { defaultValue: 'Device' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {device?.room
            ? t('deviceDetail.subroom', { room: device.room }, { defaultValue: '{{room}}' })
            : t(
                'deviceDetail.subheading',
                {},
                { defaultValue: 'Live state and per-device controls.' },
              )}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      ) : null}

      {loading && !device ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('deviceDetail.loading', {}, { defaultValue: 'Loading device…' })}
        </p>
      ) : null}

      {device ? (
        <>
          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
              )}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('deviceDetail.stateLabel', {}, { defaultValue: 'Power state' })}
                </span>
                <span
                  data-testid="device-state"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    isOn ? 'text-success' : 'text-on-surface-variant',
                  )}
                >
                  {isOn
                    ? t('deviceDetail.stateOn', {}, { defaultValue: 'On' })
                    : t('status.off', {}, { defaultValue: 'Off' })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                data-testid="device-toggle"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.roundedFull,
                  'uppercase tracking-widest disabled:opacity-50',
                  isOn
                    ? 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    : 'bg-primary text-on-primary hover:bg-primary/90',
                )}
              >
                {toggling
                  ? t('deviceDetail.toggling', {}, { defaultValue: 'Working…' })
                  : isOn
                    ? t('deviceDetail.toggleOff', {}, { defaultValue: 'Turn off' })
                    : t('deviceDetail.toggleOn', {}, { defaultValue: 'Turn on' })}
              </button>
            </div>
          </section>

          <section className={cm.stack(4)}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('deviceDetail.propertiesHeading', {}, { defaultValue: 'Properties' })}
            </h2>
            <div
              className={cm.cn(
                'bg-surface-container-lowest rounded-2xl divide-y divide-outline-variant/40',
              )}
            >
              {[
                {
                  label: t('form.type', {}, { defaultValue: 'Type' }),
                  value: device.type,
                },
                {
                  label: t('nav.status', {}, { defaultValue: 'Status' }),
                  value:
                    device.status === 'online'
                      ? t('settings.online', {}, { defaultValue: 'Online' })
                      : t('settings.offline', {}, { defaultValue: 'Offline' }),
                },
                {
                  label: t('deviceDetail.props.room', {}, { defaultValue: 'Room' }),
                  value: device.room || '—',
                },
                {
                  label: t('deviceDetail.props.manufacturer', {}, { defaultValue: 'Manufacturer' }),
                  value: device.manufacturer || '—',
                },
                {
                  label: t('form.model', {}, { defaultValue: 'Model' }),
                  value: device.model || '—',
                },
                {
                  label: t('deviceDetail.props.firmware', {}, { defaultValue: 'Firmware' }),
                  value: device.firmware_version || '—',
                },
                {
                  label: t('deviceDetail.props.lastUpdate', {}, { defaultValue: 'Last update' }),
                  value: formatRelative(device.updated_at),
                },
              ].map((p) => (
                <div
                  key={p.label}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[11px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {p.label}
                  </span>
                  <span
                    className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'tabular-nums')}
                  >
                    {p.value}
                  </span>
                </div>
              ))}
              {propertyEntries.map(([k, v]) => (
                <div
                  key={k}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[11px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {k}
                  </span>
                  <span
                    className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'tabular-nums')}
                  >
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
