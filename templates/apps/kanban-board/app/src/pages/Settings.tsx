import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface AuthUser {
  id?: string
  name?: string
  email?: string
  planKey?: string
}

interface BillingStatus {
  planKey?: string
  name?: string
  planExpiresAt?: string | null
  planAutoRenews?: boolean
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<AuthUser>()
  const [billing, setBilling] = useState<BillingStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const data = unwrap<BillingStatus>(res)
        if (data) setBilling(data)
      })
      .catch(() => {
        /* billing optional */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const planLabel = billing?.name ?? billing?.planKey ?? user?.planKey ?? 'free'
  const expires = billing?.planExpiresAt
    ? new Date(billing.planExpiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(8))}>
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark">
          {t(
            'settings.eyebrow',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} \u00b7 Settings' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('settings.heading', {}, { defaultValue: 'Account settings' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'settings.subline',
            {},
            { defaultValue: 'Your profile, plan, and account preferences.' },
          )}
        </p>
      </header>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col' }),
            cm.stack(4),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
          data-testid="settings-profile"
        >
          <header className="flex items-center gap-3">
            <span
              className={cm.cn(
                'w-11 h-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_circle
              </span>
            </span>
            <div>
              <h2 className="font-extrabold tracking-tight text-on-surface">
                {t('nav.profile', {}, { defaultValue: 'Profile' })}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-semibold">
                {t(
                  'settings.profile.sub',
                  {},
                  { defaultValue: 'Edit through the user menu in the sidebar.' },
                )}
              </p>
            </div>
          </header>
          <dl className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(3))}>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </dt>
              <dd
                className="text-sm font-bold text-on-surface text-right"
                data-testid="settings-name"
              >
                {user?.name ?? t('settings.profile.unsetName', {}, { defaultValue: 'Not set' })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </dt>
              <dd
                className="text-sm font-bold text-on-surface text-right"
                data-testid="settings-email"
              >
                {user?.email ?? '\u2014'}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col' }),
            cm.stack(4),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
          data-testid="settings-plan"
        >
          <header className="flex items-center gap-3">
            <span
              className={cm.cn(
                'w-11 h-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                credit_card
              </span>
            </span>
            <div>
              <h2 className="font-extrabold tracking-tight text-on-surface">
                {t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-semibold">
                {t(
                  'settings.plan.sub',
                  {},
                  { defaultValue: 'Manage your subscription on the pricing page.' },
                )}
              </p>
            </div>
          </header>
          <dl className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(3))}>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
              </dt>
              <dd
                className="text-sm font-bold text-on-surface text-right capitalize"
                data-testid="settings-plan-key"
              >
                {planLabel}
              </dd>
            </div>
            {expires ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('settings.plan.renews', {}, { defaultValue: 'Renews on' })}
                </dt>
                <dd className="text-sm font-bold text-on-surface text-right">{expires}</dd>
              </div>
            ) : null}
          </dl>
          <Link
            to="/pricing"
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md w-fit',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
            )}
            data-testid="settings-manage-plan"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            {t('settings.plan.manage', {}, { defaultValue: 'Manage plan' })}
          </Link>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col' }),
            cm.stack(4),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm lg:col-span-2',
          )}
          data-testid="settings-language"
        >
          <header className="flex items-center gap-3">
            <span
              className={cm.cn(
                'w-11 h-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                language
              </span>
            </span>
            <div>
              <h2 className="font-extrabold tracking-tight text-on-surface">
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-semibold">
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
            </div>
          </header>
          <LanguagePicker />
        </section>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col' }),
            cm.stack(4),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm lg:col-span-2',
          )}
          data-testid="settings-appearance"
        >
          <header className="flex items-center gap-3">
            <span
              className={cm.cn(
                'w-11 h-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                contrast
              </span>
            </span>
            <div>
              <h2 className="font-extrabold tracking-tight text-on-surface">
                {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-semibold">
                {t(
                  'common.toggleLightDark',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
            </div>
          </header>
          <ThemeToggle />
        </section>
      </div>
    </div>
  )
}

export default Settings
