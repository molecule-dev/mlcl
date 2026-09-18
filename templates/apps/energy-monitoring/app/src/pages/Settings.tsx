import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  {
    key: 'rates',
    icon: 'price_change',
    defaultTitle: 'Rate plan',
    defaultBody: 'Time-of-use, flat, or tiered rates with peak / off-peak windows.',
  },
  {
    key: 'notifications',
    icon: 'notifications_active',
    defaultTitle: 'Notifications',
    defaultBody: 'Where we send alerts (push, email) and the quiet hours we respect.',
  },
  {
    key: 'security',
    icon: 'lock',
    defaultTitle: 'Security',
    defaultBody: 'Two-factor authentication adds a one-time code when you sign in.',
  },
  {
    key: 'language',
    icon: 'language',
    defaultTitle: 'Language',
    defaultBody: 'Switch the interface language across the entire app.',
  },
  {
    key: 'export',
    icon: 'cloud_download',
    defaultTitle: 'Data export',
    defaultBody: 'CSV exports of your readings and the raw API key for your own dashboards.',
  },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

const RATE_PRESETS = [
  { key: 'flat', defaultLabel: 'Flat ($/kWh)', icon: 'horizontal_rule' },
  { key: 'tou', defaultLabel: 'Time-of-use', icon: 'schedule' },
] as const

type RatePresetKey = (typeof RATE_PRESETS)[number]['key']

interface RatePlanRow {
  id: string
  name: string
  rate_per_kwh: number | string
  peak_rate: number | string | null
  off_peak_rate: number | string | null
  peak_start_hour: number | null
  peak_end_hour: number | null
  currency: string
  status: string
  effective_date: string
}

interface MeResponse {
  notifyPush?: boolean
  notifyEmail?: boolean
  notifyQuietHours?: boolean
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState<SectionKey>('rates')
  const [ratePreset, setRatePreset] = useState<RatePresetKey>('tou')
  const [ratePlanId, setRatePlanId] = useState<string | null>(null)
  const [flatRate, setFlatRate] = useState('0.18')
  const [peakRate, setPeakRate] = useState('0.32')
  const [offPeakRate, setOffPeakRate] = useState('0.14')
  const [peakStart, setPeakStart] = useState('16')
  const [peakEnd, setPeakEnd] = useState('21')
  const [currency, setCurrency] = useState('USD')
  const [rateBusy, setRateBusy] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [rateSavedAt, setRateSavedAt] = useState<number | null>(null)

  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [quietHours, setQuietHours] = useState(true)
  const [notifyBusy, setNotifyBusy] = useState(false)
  const [notifyError, setNotifyError] = useState<string | null>(null)
  const [notifySavedAt, setNotifySavedAt] = useState<number | null>(null)

  const { user } = useAuth<{ id?: string; oauthServer?: unknown }>()
  const userId = user?.id
  const isOAuth = Boolean(user?.oauthServer)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<{ QRImageUrl?: string; secret?: string } | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfBusy, setTfBusy] = useState(false)
  const [tfError, setTfError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [r, m] = await Promise.all([
          http.get<RatePlanRow[]>('/api/costs/rates'),
          http.get<MeResponse>('/api/me'),
        ])
        if (cancelled) return
        const list = unwrapList<RatePlanRow>(r)
        const plan = list.find((p) => p.status === 'active') ?? list[0]
        if (plan) {
          setRatePlanId(plan.id)
          setFlatRate(String(plan.rate_per_kwh ?? '0.18'))
          setPeakRate(plan.peak_rate != null ? String(plan.peak_rate) : '0.32')
          setOffPeakRate(plan.off_peak_rate != null ? String(plan.off_peak_rate) : '0.14')
          setPeakStart(plan.peak_start_hour != null ? String(plan.peak_start_hour) : '16')
          setPeakEnd(plan.peak_end_hour != null ? String(plan.peak_end_hour) : '21')
          setCurrency(plan.currency || 'USD')
          setRatePreset(plan.peak_rate != null ? 'tou' : 'flat')
        }
        const me = unwrapSingle<MeResponse>(m)
        if (me) {
          setPushEnabled(me.notifyPush ?? true)
          setEmailEnabled(me.notifyEmail ?? true)
          setQuietHours(me.notifyQuietHours ?? true)
        }
      } catch (_error) {
        // leave defaults — saving will create a new rate plan on first save
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (isOAuth) return
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<{ twoFactorEnabled?: boolean }>('/api/users/me')
        if (cancelled) return
        const me = unwrapSingle<{ twoFactorEnabled?: boolean }>(res)
        setTwoFactorEnabled(Boolean(me?.twoFactorEnabled))
      } catch (_error) {
        // best-effort status read; defaults to disabled
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, isOAuth])

  async function saveRate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setRateBusy(true)
    setRateError(null)
    setRateSavedAt(null)
    const flatNum = Number(flatRate)
    const peakNum = ratePreset === 'tou' ? Number(peakRate) : null
    const offPeakNum = ratePreset === 'tou' ? Number(offPeakRate) : null
    const peakStartNum = ratePreset === 'tou' ? Number(peakStart) : null
    const peakEndNum = ratePreset === 'tou' ? Number(peakEnd) : null
    if (!Number.isFinite(flatNum) || flatNum < 0) {
      setRateError(t('settings.errorFlat', {}, { defaultValue: 'Flat rate must be ≥ 0.' }))
      setRateBusy(false)
      return
    }
    if (
      ratePreset === 'tou' &&
      (!Number.isFinite(peakNum ?? Number.NaN) ||
        !Number.isFinite(offPeakNum ?? Number.NaN) ||
        Number(peakStartNum) >= Number(peakEndNum))
    ) {
      setRateError(
        t(
          'settings.errorTou',
          {},
          { defaultValue: 'Peak/off-peak rates and a valid peak window are required.' },
        ),
      )
      setRateBusy(false)
      return
    }
    try {
      const body: Record<string, unknown> = {
        name: ratePreset === 'tou' ? 'Time-of-use' : 'Flat rate',
        rate_per_kwh: flatNum,
        currency: currency || 'USD',
      }
      if (ratePreset === 'tou') {
        body.peak_rate = peakNum
        body.off_peak_rate = offPeakNum
        body.peak_start_hour = peakStartNum
        body.peak_end_hour = peakEndNum
      } else {
        body.peak_rate = null
        body.off_peak_rate = null
        body.peak_start_hour = null
        body.peak_end_hour = null
      }
      if (ratePlanId) {
        await http.put(`/api/costs/rates/${ratePlanId}`, body)
      } else {
        const resp = await http.post<RatePlanRow>('/api/costs/rates', body)
        const created = unwrapSingle<RatePlanRow>(resp)
        if (created?.id) setRatePlanId(created.id)
      }
      setRateSavedAt(Date.now())
    } catch (err) {
      setRateError(
        err instanceof Error
          ? err.message
          : t('settings.errorSave', {}, { defaultValue: 'Could not save rate plan.' }),
      )
    } finally {
      setRateBusy(false)
    }
  }

  async function saveNotify(): Promise<void> {
    setNotifyBusy(true)
    setNotifyError(null)
    setNotifySavedAt(null)
    try {
      await http.patch('/api/me', {
        notifyPush: pushEnabled,
        notifyEmail: emailEnabled,
        notifyQuietHours: quietHours,
      })
      setNotifySavedAt(Date.now())
    } catch (err) {
      setNotifyError(
        err instanceof Error
          ? err.message
          : t('settings.errorNotify', {}, { defaultValue: 'Could not save notification prefs.' }),
      )
    } finally {
      setNotifyBusy(false)
    }
  }

  async function downloadCsv(): Promise<void> {
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 30)
      const resp = await http.get<Record<string, unknown>[]>(
        `/api/readings/daily?start_date=${start.toISOString()}&end_date=${end.toISOString()}`,
      )
      const list = unwrapList<Record<string, unknown>>(resp?.data)
      const header = 'date,consumption_kwh,production_kwh,net_export_kwh,cost\n'
      const body = list
        .map(
          (row) =>
            `${row.date},${Number(row.consumption ?? row.total ?? 0).toFixed(3)},${Number(row.production ?? 0).toFixed(3)},${Number(row.net_export ?? 0).toFixed(3)},${Number(row.cost ?? 0).toFixed(2)}`,
        )
        .join('\n')
      const blob = new Blob([header + body], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `energy-export-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (_error) {
      // ignore — an empty/failed CSV download is acceptable; user can retry
    }
  }

  function closeTf(): void {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError(null)
  }

  async function startEnable(): Promise<void> {
    setTfError(null)
    setTfBusy(true)
    setTfModal('enable')
    try {
      const res = await http.post<{ QRImageUrl?: string; secret?: string }>(
        `/api/users/${userId}/verify-two-factor`,
        { action: 'setup' },
      )
      const data = unwrapSingle<{ QRImageUrl?: string; secret?: string }>(res)
      setTfSetup(data)
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfBusy(false)
    }
  }

  async function submitTf(action: 'enable' | 'disable'): Promise<void> {
    setTfError(null)
    setTfBusy(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfBusy(false)
    }
  }

  return (
    <div
      data-mol-id="settings-page"
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
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('settings.subheading', {}, { defaultValue: 'Rates, notifications, and data export.' })}
        </p>
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
      >
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            data-mol-id={`settings-section-${s.key}`}
            onClick={() => setActive(s.key)}
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl text-left transition-all',
              active === s.key
                ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                : 'bg-surface-container-lowest hover:bg-surface-container-low',
            )}
          >
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 4),
                active === s.key ? 'bg-white/20 text-white' : 'bg-surface text-primary',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">{s.icon}</span>
            </div>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), cm.sp('mb', 1))}>
              {t(`settings.section.${s.key}.title`, {}, { defaultValue: s.defaultTitle })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                active === s.key ? 'text-white/85' : 'text-on-surface-variant',
              )}
            >
              {t(`settings.section.${s.key}.body`, {}, { defaultValue: s.defaultBody })}
            </p>
          </button>
        ))}
      </section>

      {active === 'rates' ? (
        <form
          data-mol-id="settings-rate-form"
          onSubmit={saveRate}
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settings.ratesHeading', {}, { defaultValue: 'Rate plan' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}>
            {RATE_PRESETS.map((r) => (
              <button
                key={r.key}
                type="button"
                data-mol-id={`settings-rate-preset-${r.key}`}
                onClick={() => setRatePreset(r.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl border-2 transition-all',
                  ratePreset === r.key
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant hover:border-primary/40 bg-surface',
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined',
                    ratePreset === r.key ? 'text-primary' : 'text-on-surface-variant',
                  )}
                  aria-hidden="true"
                >
                  {r.icon}
                </span>
                {t(`settings.rate.${r.key}`, {}, { defaultValue: r.defaultLabel })}
              </button>
            ))}
          </div>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.flatRate', {}, { defaultValue: 'Flat rate ($/kWh)' })}
              </span>
              <input
                data-mol-id="settings-flat-rate"
                type="number"
                step="0.01"
                min="0"
                value={flatRate}
                onChange={(e) => setFlatRate(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
                )}
              />
            </label>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.currency', {}, { defaultValue: 'Currency' })}
              </span>
              <input
                data-mol-id="settings-currency"
                type="text"
                value={currency}
                maxLength={6}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none uppercase tabular-nums transition-colors',
                )}
              />
            </label>
          </div>
          {ratePreset === 'tou' ? (
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.peakRate', {}, { defaultValue: 'Peak ($/kWh)' })}
                </span>
                <input
                  data-mol-id="settings-peak-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={peakRate}
                  onChange={(e) => setPeakRate(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
                  )}
                />
              </label>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.offPeakRate', {}, { defaultValue: 'Off-peak ($/kWh)' })}
                </span>
                <input
                  data-mol-id="settings-off-peak-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={offPeakRate}
                  onChange={(e) => setOffPeakRate(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
                  )}
                />
              </label>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.peakStart', {}, { defaultValue: 'Peak start (h)' })}
                </span>
                <input
                  data-mol-id="settings-peak-start"
                  type="number"
                  min="0"
                  max="23"
                  value={peakStart}
                  onChange={(e) => setPeakStart(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
                  )}
                />
              </label>
              <label className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.peakEnd', {}, { defaultValue: 'Peak end (h)' })}
                </span>
                <input
                  data-mol-id="settings-peak-end"
                  type="number"
                  min="0"
                  max="23"
                  value={peakEnd}
                  onChange={(e) => setPeakEnd(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
                  )}
                />
              </label>
            </div>
          ) : null}
          {rateError ? (
            <p
              data-mol-id="settings-rate-error"
              role="alert"
              className={cm.cn(cm.textSize('sm'), 'text-error')}
            >
              {rateError}
            </p>
          ) : null}
          {rateSavedAt && !rateError ? (
            <p
              data-mol-id="settings-rate-saved"
              role="status"
              className={cm.cn(cm.textSize('sm'), 'text-success')}
            >
              {t('settings.rateSaved', {}, { defaultValue: 'Rate plan saved.' })}
            </p>
          ) : null}
          <div>
            <button
              type="submit"
              data-mol-id="settings-rate-save"
              disabled={rateBusy}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60',
              )}
            >
              {rateBusy
                ? t('settings.saving', {}, { defaultValue: 'Saving\u2026' })
                : t('settings.saveRate', {}, { defaultValue: 'Save rate plan' })}
            </button>
          </div>
        </form>
      ) : null}

      {active === 'notifications' ? (
        <section
          data-mol-id="settings-notify-section"
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settings.notifyHeading', {}, { defaultValue: 'Where to send alerts' })}
          </h2>
          {[
            { key: 'push', label: 'Push notifications', value: pushEnabled, set: setPushEnabled },
            { key: 'email', label: 'Email summaries', value: emailEnabled, set: setEmailEnabled },
            {
              key: 'quiet',
              label: 'Respect quiet hours (10pm–7am)',
              value: quietHours,
              set: setQuietHours,
            },
          ].map((row) => (
            <div
              key={row.key}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('p', 4),
                'bg-surface rounded-xl',
              )}
            >
              <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                {t(`settings.notify.${row.key}`, {}, { defaultValue: row.label })}
              </p>
              <button
                type="button"
                data-mol-id={`settings-notify-${row.key}`}
                onClick={() => row.set(!row.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest transition-all',
                  row.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                )}
                aria-pressed={row.value}
              >
                {row.value
                  ? t('settings.notify.on', {}, { defaultValue: 'On' })
                  : t('status.off', {}, { defaultValue: 'Off' })}
              </button>
            </div>
          ))}
          {notifyError ? (
            <p
              data-mol-id="settings-notify-error"
              role="alert"
              className={cm.cn(cm.textSize('sm'), 'text-error')}
            >
              {notifyError}
            </p>
          ) : null}
          {notifySavedAt && !notifyError ? (
            <p
              data-mol-id="settings-notify-saved"
              role="status"
              className={cm.cn(cm.textSize('sm'), 'text-success')}
            >
              {t('settings.notifySaved', {}, { defaultValue: 'Notification preferences saved.' })}
            </p>
          ) : null}
          <div>
            <button
              type="button"
              data-mol-id="settings-notify-save"
              disabled={notifyBusy}
              onClick={() => void saveNotify()}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60',
              )}
            >
              {notifyBusy
                ? t('settings.saving', {}, { defaultValue: 'Saving\u2026' })
                : t('settings.saveNotify', {}, { defaultValue: 'Save preferences' })}
            </button>
          </div>
        </section>
      ) : null}

      {active === 'security' ? (
        <section
          data-mol-id="settings-security-section"
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settings.securityHeading', {}, { defaultValue: 'Two-factor authentication' })}
          </h2>
          {isOAuth ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.twoFactorOAuth',
                {},
                {
                  defaultValue:
                    'Your account signs in through a connected provider, so two-factor is managed there.',
                },
              )}
            </p>
          ) : (
            <>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.twoFactorBody',
                  {},
                  {
                    defaultValue:
                      'Require a one-time code from your authenticator app each time you sign in.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 4),
                  'bg-surface rounded-xl',
                )}
              >
                <div className={cm.stack(1)}>
                  <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                    {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      twoFactorEnabled ? 'text-success' : 'text-on-surface-variant',
                    )}
                  >
                    {twoFactorEnabled
                      ? t('settings.twoFactorOn', {}, { defaultValue: 'On' })
                      : t('status.off', {}, { defaultValue: 'Off' })}
                  </p>
                </div>
                {twoFactorEnabled ? (
                  <button
                    type="button"
                    data-mol-id="settings-two-factor-disable"
                    onClick={() => {
                      setTfError(null)
                      setTfToken('')
                      setTfModal('disable')
                    }}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors',
                    )}
                  >
                    {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-mol-id="settings-two-factor-enable"
                    onClick={() => void startEnable()}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'bg-primary text-on-primary hover:bg-primary/90 transition-colors',
                    )}
                  >
                    {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      {active === 'language' ? (
        <section
          data-mol-id="settings-language-section"
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
          <div>
            <LanguagePicker />
          </div>
          <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
            <div className={cm.sp('mb', 6)}>
              <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
                {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'common.toggleLightDark',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
            </div>
            <ThemeToggle />
          </section>
        </section>
      ) : null}

      {active === 'export' ? (
        <section
          data-mol-id="settings-export-section"
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('common.dataExport', {}, { defaultValue: 'Data export' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.exportBody',
              {},
              {
                defaultValue:
                  'Download a CSV of the last 30 days of daily totals or grab an ingest token from any meter detail page to push readings programmatically.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            <button
              type="button"
              data-mol-id="settings-export-csv"
              onClick={() => void downloadCsv()}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
              )}
            >
              {t('settings.exportCsv', {}, { defaultValue: 'Download last 30 days' })}
            </button>
          </div>
        </section>
      ) : null}

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
        data-mol-id="settings-two-factor-modal"
        title={
          tfModal === 'disable'
            ? t(
                'settings.twoFactorDisableTitle',
                {},
                { defaultValue: 'Disable two-factor authentication' },
              )
            : t(
                'settings.twoFactorEnableTitle',
                {},
                { defaultValue: 'Enable two-factor authentication' },
              )
        }
      >
        {tfError ? (
          <p
            role="alert"
            data-mol-id="settings-two-factor-error"
            className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-error')}
          >
            {tfError}
          </p>
        ) : null}
        {tfModal === 'enable' && !tfSetup && tfBusy ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('settings.saving', {}, { defaultValue: 'Saving…' })}
          </p>
        ) : null}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.twoFactorScan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={tfSetup.QRImageUrl}
              alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn(cm.mxAuto, cm.maxW('xs'))}
            />
            {tfSetup.secret ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant text-center break-all font-mono',
                )}
              >
                {tfSetup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {tfModal === 'disable' || tfSetup ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.stack(4)}
          >
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </span>
              <input
                data-mol-id="settings-two-factor-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={tfToken}
                onChange={(e) => setTfToken(e.target.value)}
                required
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
                )}
              />
            </label>
            <button
              type="submit"
              data-mol-id="settings-two-factor-submit"
              disabled={tfBusy}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full transition-colors disabled:opacity-60',
                tfModal === 'disable'
                  ? 'bg-error text-on-error hover:bg-error/90'
                  : 'bg-primary text-on-primary hover:bg-primary/90',
              )}
            >
              {tfBusy
                ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                : tfModal === 'disable'
                  ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                  : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </button>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
