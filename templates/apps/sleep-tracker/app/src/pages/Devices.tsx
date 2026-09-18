import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface WearableConnection {
  id: string
  user_id: string
  provider: string
  external_user_id?: string | null
  is_active?: boolean
  last_synced_at?: string | null
  scopes?: string | string[]
  created_at?: string
}

const PROVIDERS: {
  value: string
  label: string
  brand: string
  icon: string
  type: 'wearable' | 'ring' | 'mat' | 'phone'
}[] = [
  { value: 'apple_health', label: 'Apple Health', brand: 'Apple', icon: 'watch', type: 'wearable' },
  { value: 'google_fit', label: 'Google Fit', brand: 'Google', icon: 'smartphone', type: 'phone' },
  { value: 'fitbit', label: 'Fitbit', brand: 'Fitbit', icon: 'watch', type: 'wearable' },
  { value: 'oura', label: 'Oura Ring', brand: 'Oura', icon: 'circle', type: 'ring' },
  { value: 'withings', label: 'Withings', brand: 'Withings', icon: 'bed', type: 'mat' },
  { value: 'garmin', label: 'Garmin', brand: 'Garmin', icon: 'watch', type: 'wearable' },
]

const TYPE_PALETTE = {
  wearable: { bg: 'var(--color-badge-indigo-bg)', fg: 'var(--color-badge-indigo-fg)' },
  ring: { bg: 'var(--color-badge-violet-bg)', fg: 'var(--color-badge-violet-fg)' },
  mat: { bg: 'var(--color-badge-green-bg)', fg: 'var(--color-badge-green-fg)' },
  phone: { bg: 'var(--color-badge-amber-bg)', fg: 'var(--color-badge-amber-fg)' },
} as const

function relativeSync(iso: string | null | undefined): string {
  if (!iso) return 'Never synced'
  try {
    const then = new Date(iso).getTime()
    const sec = Math.max(0, Math.round((Date.now() - then) / 1000))
    if (sec < 60) return `${sec}s ago`
    const min = Math.round(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.round(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.round(hr / 24)
    return `${day}d ago`
  } catch (_error) {
    // invalid date string — return raw value as fallback
    return iso
  }
}

export function Devices() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [conns, setConns] = useState<WearableConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showLink, setShowLink] = useState(false)
  const [draftProvider, setDraftProvider] = useState(PROVIDERS[0]!.value)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const res = await http.get('/api/wearables').catch(() => null)
    setConns(unwrapList<WearableConnection>(res))
  }

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/wearables')
      .then((res) => {
        if (cancelled) return
        setConns(unwrapList<WearableConnection>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const link = async () => {
    setBusy(true)
    try {
      const res = await http.post('/api/wearables', {
        provider: draftProvider,
        external_user_id: `${draftProvider}-${Date.now()}`,
      })
      const created = unwrapSingle<WearableConnection>(res)
      if (created) {
        setConns((prev) => [created, ...prev])
      } else {
        await refresh()
      }
      setShowLink(false)
    } finally {
      setBusy(false)
    }
  }

  const togglePause = async (conn: WearableConnection) => {
    const next = !(conn.is_active ?? true)
    setConns((prev) => prev.map((c) => (c.id === conn.id ? { ...c, is_active: next } : c)))
    await http.patch(`/api/wearables/${conn.id}`, { is_active: next }).catch(() => refresh())
  }

  const unlink = async (conn: WearableConnection) => {
    setConns((prev) => prev.filter((c) => c.id !== conn.id))
    await http.delete(`/api/wearables/${conn.id}`).catch(() => refresh())
  }

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('devices.eyebrow', {}, { defaultValue: 'Connected devices' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          >
            {t('devices.heading', {}, { defaultValue: 'Wearables, rings and mats' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowLink(true)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>add_link</span>
          {t('devices.connect', {}, { defaultValue: 'Connect a device' })}
        </button>
      </header>

      {showLink ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-md space-y-4',
          )}
          aria-label={t('devices.linkDialog', {}, { defaultValue: 'Connect a device' })}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('devices.linkDialog', {}, { defaultValue: 'Connect a device' })}
          </h2>
          <label className={cm.cn('block space-y-1')}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('devices.providerField', {}, { defaultValue: 'Provider' })}
            </span>
            <select
              value={draftProvider}
              onChange={(e) => setDraftProvider(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full rounded-xl border-2 border-outline-variant',
              )}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }))}>
            <button
              type="button"
              onClick={() => setShowLink(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full border-2 border-outline-variant',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={link}
              disabled={busy}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary shadow-md disabled:opacity-60',
              )}
            >
              {busy
                ? t('devices.linking', {}, { defaultValue: 'Connecting…' })
                : t('common.connect', {}, { defaultValue: 'Connect' })}
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('devices.loading', {}, { defaultValue: 'Loading devices…' })}
        </p>
      ) : conns.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border-2 border-dashed border-outline-variant text-center space-y-3',
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('devices.emptyHeading', {}, { defaultValue: 'No devices linked' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'devices.emptyBody',
              {},
              {
                defaultValue:
                  'Connect a wearable, ring, or sleep mat to import sleep stages automatically.',
              },
            )}
          </p>
        </div>
      ) : (
        <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
          {conns.map((conn) => {
            const meta = PROVIDERS.find((p) => p.value === conn.provider) ?? {
              value: conn.provider,
              label: conn.provider,
              brand: '—',
              icon: 'watch',
              type: 'wearable' as const,
            }
            const palette = TYPE_PALETTE[meta.type]
            const active = conn.is_active ?? true
            return (
              <article
                key={conn.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 hover:shadow-md transition-shadow',
                )}
                style={{ borderLeftColor: palette.fg, opacity: active ? 1 : 0.7 }}
              >
                <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.flex1)}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-12 w-12 rounded-xl shrink-0',
                      )}
                      style={{ backgroundColor: palette.bg, color: palette.fg }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-2xl')}
                        aria-hidden="true"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {meta.icon}
                      </span>
                    </span>
                    <div className={cm.cn('min-w-0')}>
                      <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}>
                        {meta.label}
                      </h3>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {meta.brand}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('bold'),
                      'rounded-full uppercase tracking-widest text-[10px] whitespace-nowrap',
                    )}
                    style={
                      active
                        ? {
                            backgroundColor: 'var(--color-badge-green-bg)',
                            color: 'var(--color-badge-green-fg)',
                          }
                        : {
                            backgroundColor: 'var(--color-badge-amber-bg)',
                            color: 'var(--color-badge-amber-fg)',
                          }
                    }
                  >
                    {active
                      ? t('status.active', {}, { defaultValue: 'Active' })
                      : t('status.paused', {}, { defaultValue: 'Paused' })}
                  </span>
                </div>

                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('mt', 4),
                    'flex-wrap',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-base text-on-surface-variant',
                      )}
                      aria-hidden="true"
                    >
                      sync
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {t(
                        'devices.synced',
                        { value: relativeSync(conn.last_synced_at) },
                        { defaultValue: 'Synced {{value}}' },
                      )}
                    </span>
                  </div>
                </div>

                <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }), cm.sp('mt', 4))}>
                  <button
                    type="button"
                    onClick={() => togglePause(conn)}
                    aria-label={
                      active
                        ? t(
                            'devices.pauseAria',
                            { brand: meta.brand },
                            { defaultValue: 'Pause {{brand}}' },
                          )
                        : t(
                            'devices.resumeAria',
                            { brand: meta.brand },
                            { defaultValue: 'Resume {{brand}}' },
                          )
                    }
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'rounded-full border-2 border-outline-variant hover:border-primary',
                    )}
                  >
                    {active
                      ? t('common.pause', {}, { defaultValue: 'Pause' })
                      : t('common.resume', {}, { defaultValue: 'Resume' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => unlink(conn)}
                    aria-label={t(
                      'devices.unlinkAria',
                      { brand: meta.brand },
                      { defaultValue: 'Unlink {{brand}}' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'rounded-full border-2 border-outline-variant hover:border-error hover:text-error',
                    )}
                  >
                    {t('devices.unlink', {}, { defaultValue: 'Unlink' })}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
