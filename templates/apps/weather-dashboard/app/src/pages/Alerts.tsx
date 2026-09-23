import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AlertBanner, type WeatherAlertItem } from '../components/AlertBanner.js'

const PREFERENCE_TOGGLES = [
  { key: 'severeWind', defaultLabel: 'Severe wind & thunderstorms', defaultEnabled: true },
  { key: 'flood', defaultLabel: 'Flooding', defaultEnabled: true },
  { key: 'air', defaultLabel: 'Air quality advisories', defaultEnabled: false },
  { key: 'heat', defaultLabel: 'Heat & cold extremes', defaultEnabled: true },
  { key: 'winter', defaultLabel: 'Winter storms', defaultEnabled: true },
] as const

type PrefKey = (typeof PREFERENCE_TOGGLES)[number]['key']

interface ApiLocation {
  id: string
  name: string
  is_default?: boolean
}

interface ApiAlertPreferences {
  enabled?: boolean
  min_severity?: string
  kinds?: string[] | string | null
  channels?: string[] | string | null
}

function unwrapBody(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const wrapper = payload as { data?: unknown }
  return 'data' in wrapper ? wrapper.data : payload
}

function unwrapList<T>(payload: unknown): T[] {
  const body = unwrapBody(payload)
  if (Array.isArray(body)) return body as T[]
  if (body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items)) {
    return (body as { items: T[] }).items
  }
  return []
}

function unwrapKinds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      // value is not valid JSON — fall back to empty array
      return []
    }
  }
  return []
}

export function Alerts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [alerts, setAlerts] = useState<WeatherAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [defaultLocation, setDefaultLocation] = useState<ApiLocation | null>(null)
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(
    PREFERENCE_TOGGLES.reduce(
      (acc, p) => ({ ...acc, [p.key]: p.defaultEnabled }),
      {} as Record<PrefKey, boolean>,
    ),
  )
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const [alertsRes, defaultLoc] = await Promise.all([
          http.get<WeatherAlertItem[]>('/api/alerts'),
          http.get<ApiLocation>('/api/locations/default').catch(() => null),
        ])
        if (cancelled) return
        setAlerts(unwrapList<WeatherAlertItem>(alertsRes))
        const locBody = unwrapBody(defaultLoc)
        const loc =
          locBody && typeof locBody === 'object' && 'id' in locBody
            ? (locBody as ApiLocation)
            : null
        setDefaultLocation(loc)
        if (loc) {
          try {
            const p = await http.get<ApiAlertPreferences>(`/api/alerts/preferences/${loc.id}`)
            if (cancelled) return
            const prefBody = unwrapBody(p) as ApiAlertPreferences | null | undefined
            const kinds = unwrapKinds(prefBody?.kinds)
            const next: Record<PrefKey, boolean> = { ...prefs }
            for (const toggle of PREFERENCE_TOGGLES) {
              next[toggle.key] =
                kinds.length > 0 ? kinds.includes(toggle.key) : toggle.defaultEnabled
            }
            setPrefs(next)
          } catch (_error) {
            // Preferences not yet saved for this location — use defaults on first load
          }
        }
      } catch (error) {
        logError('alerts.load', error)
        if (!cancelled) {
          setError(t('alerts.loadError', {}, { defaultValue: 'Could not load alerts.' }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const handleDismiss = async (id: string) => {
    const previous = alerts
    setAlerts((current) => current.filter((a) => a.id !== id))
    try {
      await http.post(`/api/alerts/${id}/dismiss`, {})
      track({ name: 'alert.acknowledged', properties: { alert_id: id } })
    } catch (error) {
      logError('alerts.dismiss', error)
      setAlerts(previous)
    }
  }

  const togglePref = async (key: PrefKey) => {
    if (!defaultLocation) {
      setPrefsError(
        t(
          'alerts.preferences.needLocation',
          {},
          {
            defaultValue: 'Add a default location to manage alert subscriptions.',
          },
        ),
      )
      return
    }
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setPrefsSaving(true)
    setPrefsError(null)
    try {
      const enabledKinds = PREFERENCE_TOGGLES.filter((p) => next[p.key]).map((p) => p.key)
      await http.put(`/api/alerts/preferences/${defaultLocation.id}`, {
        enabled: enabledKinds.length > 0,
        kinds: enabledKinds,
        channels: ['push'],
      })
      track({
        name: 'alert.preferences_saved',
        properties: { location_id: defaultLocation.id, enabled_kinds: enabledKinds.length },
      })
    } catch (error) {
      logError('alerts.togglePref', error)
      setPrefs(prefs)
      setPrefsError(
        t(
          'alerts.preferences.saveError',
          {},
          {
            defaultValue: 'Could not save your alert preferences. Please try again.',
          },
        ),
      )
    } finally {
      setPrefsSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-warning',
          )}
        >
          {t('status.active', {}, { defaultValue: 'Active' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('alerts.heading', {}, { defaultValue: 'Weather alerts' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-xl')}>
          {t(
            'alerts.subheading',
            {},
            {
              defaultValue:
                'Watches, warnings, and advisories across every saved location — dismiss the ones you have already heard about and tune what wakes you up.',
            },
          )}
        </p>
      </header>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('alerts.activeHeading', {}, { defaultValue: 'Active alerts' })}
          </h2>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'alerts.activeCount',
              { count: alerts.length },
              { defaultValue: '{{count}} active' },
            )}
          </span>
        </div>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('alerts.loading', {}, { defaultValue: 'Listening for advisories…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}>{error}</p>
        ) : alerts.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            <span
              className="material-symbols-outlined text-4xl text-success"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              check_circle
            </span>
            <p className={cm.cn(cm.sp('mt', 2), cm.fontWeight('semibold'))}>
              {t('alerts.empty', {}, { defaultValue: 'All clear across your saved locations.' })}
            </p>
          </div>
        ) : (
          <div className={cm.stack(2)}>
            {alerts.map((alert) => (
              <AlertBanner key={alert.id} alert={alert} onDismiss={handleDismiss} />
            ))}
          </div>
        )}
      </section>

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
      >
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('alerts.preferencesHeading', {}, { defaultValue: 'Subscriptions' })}
          </h2>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-primary',
            )}
          >
            {defaultLocation
              ? t(
                  'alerts.preferencesNote',
                  { name: defaultLocation.name },
                  { defaultValue: 'For {{name}} · push' },
                )
              : t(
                  'alerts.preferences.noLocation',
                  {},
                  {
                    defaultValue: 'Set a default location first',
                  },
                )}
          </span>
        </div>
        {prefsError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{prefsError}</p> : null}
        {prefsSaving ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
          </p>
        ) : null}
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
          {PREFERENCE_TOGGLES.map((pref) => {
            const enabled = prefs[pref.key]
            return (
              <button
                key={pref.key}
                type="button"
                onClick={() => togglePref(pref.key)}
                disabled={!defaultLocation || prefsSaving}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 4),
                  'rounded-xl',
                  'bg-surface-container hover:bg-surface-container-low transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                aria-pressed={enabled}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      cm.roundedFull,
                      enabled ? 'bg-primary/20 text-primary' : 'bg-surface text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
                      {enabled ? 'notifications_active' : 'notifications_off'}
                    </span>
                  </span>
                  <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                    {t(
                      `alerts.preference.${pref.key}.label`,
                      {},
                      { defaultValue: pref.defaultLabel },
                    )}
                  </span>
                </div>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full',
                    enabled ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant',
                  )}
                >
                  {enabled
                    ? t('alerts.preference.on', {}, { defaultValue: 'On' })
                    : t('status.off', {}, { defaultValue: 'Off' })}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
