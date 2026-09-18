import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useBillingStatus, useCancelSubscription } from '@molecule/app-billing-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { AuthSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import type { SmartHomeDashboardLimits } from '../types/tier-limits.js'

interface HubInfo {
  id: string
  name: string
  status: 'online' | 'offline'
  protocols: string[]
  devices: number
}

interface DeviceStats {
  total?: number
  online?: number
  offline?: number
  on?: number
}

const HOME_HUB: HubInfo = {
  id: 'main',
  name: 'Home hub',
  status: 'online',
  protocols: ['Matter', 'Zigbee', 'Wi-Fi'],
  devices: 0,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const {
    data: billingStatus,
    execute: refetchBilling,
    loading: billingLoading,
  } = useBillingStatus<SmartHomeDashboardLimits>()
  const { cancel, loading: cancelling, error: cancelError } = useCancelSubscription()
  const [stats, setStats] = useState<DeviceStats>({})

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/iot-devices/stats/overview')
      .then((payload) => {
        if (cancelled) return
        if (payload && typeof payload === 'object') setStats(payload as DeviceStats)
      })
      .catch((err) => {
        console.warn('[settings] device stats failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const planName = billingStatus?.name ?? (billingLoading ? '…' : 'Free')
  const planIsFree = billingStatus ? billingStatus.isFree : true
  const planLimits = billingStatus?.limits

  const hubDeviceCount = Number(stats.total || 0)
  const hubs: HubInfo[] = [{ ...HOME_HUB, devices: hubDeviceCount }]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
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
          {t('settings.subheading', {}, { defaultValue: 'Plan, hubs, and account preferences.' })}
        </p>
      </header>

      <section
        data-testid="settings-plan-section"
        className={cm.cn(cm.sp('p', 6), cm.stack(4), 'bg-surface-container-lowest rounded-2xl')}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
          <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('nav.plan', {}, { defaultValue: 'Plan' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.plan.subheading',
                {},
                { defaultValue: 'Your current entitlement and limits.' },
              )}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              data-testid="settings-plan-name"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest',
                planIsFree
                  ? 'bg-surface-container text-on-surface-variant'
                  : 'bg-primary-container text-on-primary-container',
              )}
            >
              {planName}
            </span>
            {planIsFree ? (
              <Link
                to="/pricing"
                data-testid="settings-upgrade-link"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.roundedFull,
                  'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90',
                )}
              >
                {t('settings.plan.upgrade', {}, { defaultValue: 'See plans' })}
              </Link>
            ) : (
              <button
                type="button"
                disabled={cancelling}
                data-testid="settings-cancel-subscription"
                onClick={async () => {
                  const result = await cancel()
                  if (result?.canceled) await refetchBilling()
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.roundedFull,
                  'uppercase tracking-widest bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-50',
                )}
              >
                {cancelling
                  ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                  : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
              </button>
            )}
          </div>
        </div>
        {cancelError ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              'rounded-xl bg-error-container text-on-error-container text-sm',
            )}
          >
            {t(
              'settings.plan.cancelError',
              {},
              { defaultValue: 'Could not cancel subscription. Try again.' },
            )}
          </div>
        ) : null}
        {planLimits ? (
          <dl className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-3')}>
            {[
              { key: 'maxDevices', label: t('settings.devices', {}, { defaultValue: 'Devices' }) },
              {
                key: 'maxAutomations',
                label: t('settings.limit.automations', {}, { defaultValue: 'Automations' }),
              },
              {
                key: 'maxScenes',
                label: t('settings.limit.scenes', {}, { defaultValue: 'Scenes' }),
              },
              {
                key: 'retentionDays',
                label: t('settings.limit.history', {}, { defaultValue: 'History days' }),
              },
            ].map((item) => {
              const v = planLimits[item.key as keyof SmartHomeDashboardLimits]
              const value = typeof v === 'number' ? (v >= 999_999 ? '∞' : v.toLocaleString()) : '—'
              return (
                <div key={item.key} className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <dt
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {item.label}
                  </dt>
                  <dd className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'tabular-nums')}>
                    {value}
                  </dd>
                </div>
              )
            })}
          </dl>
        ) : null}
      </section>

      <section
        className={cm.cn(cm.sp('p', 6), cm.stack(4), 'bg-surface-container-lowest rounded-2xl')}
      >
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('settings.security.heading', {}, { defaultValue: 'Security' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.security.subheading',
              {},
              { defaultValue: 'Password and two-factor authentication.' },
            )}
          </p>
        </div>
        <AuthSection />
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settings.hubsHeading', {}, { defaultValue: 'Hubs' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          {hubs.map((h) => (
            <div
              key={h.id}
              className={cm.cn(
                cm.sp('p', 5),
                cm.flex({ direction: 'col', gap: 'sm' }),
                'bg-surface-container-lowest rounded-2xl border-l-4',
                h.status === 'online' ? 'border-l-success' : 'border-l-error',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'))}>{h.name}</p>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest',
                    h.status === 'online'
                      ? 'bg-success-container text-on-success-container'
                      : 'bg-error-container text-on-error-container',
                  )}
                >
                  {t(`settings.hubStatus.${h.status}`, {}, { defaultValue: h.status })}
                </span>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
                {h.protocols.map((p) => (
                  <span
                    key={p}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 0),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      'text-[10px] py-0.5 bg-surface-container text-on-surface-variant uppercase tracking-widest',
                    )}
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.hubDeviceCount',
                  { count: h.devices },
                  { defaultValue: '{{count}} devices paired' },
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className={cm.cn(cm.sp('p', 6), cm.stack(4), 'bg-surface-container-lowest rounded-2xl')}
      >
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
        </div>
        <LanguagePicker />
      </section>
      <section
        className={cm.cn(cm.sp('p', 6), cm.stack(4), 'bg-surface-container-lowest rounded-2xl')}
      >
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  )
}
