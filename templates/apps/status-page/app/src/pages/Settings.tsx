import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const SECTIONS = [
  { key: 'branding', icon: 'palette', defaultLabel: 'Branding' },
  { key: 'language', icon: 'translate', defaultLabel: 'Language' },
  { key: 'authentication', icon: 'verified_user', defaultLabel: 'Authentication & SSO' },
  { key: 'integrations', icon: 'extension', defaultLabel: 'Integrations' },
  { key: 'subscribers', icon: 'mail', defaultLabel: 'Subscriber preferences' },
  { key: 'incidents', icon: 'warning', defaultLabel: 'Incident defaults' },
  { key: 'maintenance', icon: 'build_circle', defaultLabel: 'Maintenance defaults' },
  { key: 'audit', icon: 'history', defaultLabel: 'Audit & retention' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [active, setActive] = useState<SectionKey>('branding')

  const integrations = [
    {
      id: 'pagerduty',
      name: 'PagerDuty',
      desc: 'Page on-call rotation when an incident is opened.',
      enabled: true,
      icon: 'phone_iphone',
      tint: '#10b981',
    },
    {
      id: 'slack',
      name: 'Slack',
      desc: 'Cross-post status updates to a channel.',
      enabled: true,
      icon: 'forum',
      tint: '#a78bfa',
    },
    {
      id: 'opsgenie',
      name: 'Opsgenie',
      desc: 'Mirror incidents into Opsgenie alerts.',
      enabled: false,
      icon: 'shield',
      tint: '#6366f1',
    },
    {
      id: 'jira',
      name: 'Jira',
      desc: 'Create a postmortem ticket on resolution.',
      enabled: false,
      icon: 'task',
      tint: '#f59e0b',
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))} data-mol-id="page-settings">
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn(
            'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2',
          )}
        >
          {t(
            'settingsPage.eyebrow',
            { app: APP_NAME },
            { defaultValue: '$ {{app}} settings --edit' },
          )}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settingsPage.heading', {}, { defaultValue: 'Workspace settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settingsPage.subheading',
            {},
            {
              defaultValue:
                'Branding, authentication, and downstream integrations for your status page.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]')}>
        <nav
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          className={cm.cn('rounded-2xl p-2')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.45)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          <ul className={cm.cn('space-y-1')}>
            {SECTIONS.map((s) => {
              const isActive = active === s.key
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setActive(s.key)}
                    className={cm.cn(
                      'w-full inline-flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    )}
                    style={{
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: isActive ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                    }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      {s.icon}
                    </span>
                    <span className={cm.cn('font-medium')}>
                      {t(`settingsPage.section.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div
          className={cm.cn('rounded-2xl p-8')}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid var(--color-border-card)',
          }}
        >
          {active === 'branding' ? (
            <div>
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t('settingsPage.branding.heading', {}, { defaultValue: 'Branding' })}
              </h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                {t(
                  'settingsPage.branding.body',
                  { app: APP_NAME },
                  { defaultValue: 'Customize how {{app}} appears on the public status page.' },
                )}
              </p>
              <dl className={cm.stack(4)}>
                <div className={cm.cn('mt-6')}>
                  <dt
                    className={cm.cn(
                      'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settingsPage.branding.appName', {}, { defaultValue: 'App name' })}
                  </dt>
                  <dd className={cm.cn('mt-1')}>
                    <BrandWordmark as="span" size="sm" />
                  </dd>
                </div>
                <div className={cm.cn('mt-2')}>
                  <dt
                    className={cm.cn(
                      'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'settingsPage.branding.subscribeCta',
                      {},
                      { defaultValue: 'Public subscribe CTA' },
                    )}
                  </dt>
                  <dd className={cm.cn('mt-1 font-mono text-base')}>
                    {t(
                      'settingsPage.branding.subscribeCtaValue',
                      {},
                      { defaultValue: 'Get every status change as it happens.' },
                    )}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settingsPage.branding.publicUrl', {}, { defaultValue: 'Public URL' })}
                  </dt>
                  <dd className={cm.cn('mt-1 font-mono text-base')}>
                    {`https://status.${APP_NAME.toLowerCase()}.example.com`}
                  </dd>
                </div>
              </dl>
            </div>
          ) : active === 'language' ? (
            <div>
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <div className={cm.cn('mt-6')}>
                <LanguagePicker />
              </div>
            </div>
          ) : active === 'integrations' ? (
            <div>
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
              </h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                {t(
                  'settingsPage.integrations.body',
                  {},
                  { defaultValue: 'Mirror incidents downstream so your runbooks stay in sync.' },
                )}
              </p>
              <ul className={cm.cn('mt-6 space-y-3')}>
                {integrations.map((i) => (
                  <li
                    key={i.id}
                    className={cm.cn(
                      'rounded-xl px-4 py-3 flex items-center justify-between gap-3',
                    )}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid var(--color-border-card)',
                    }}
                  >
                    <div className={cm.cn('flex items-center gap-3')}>
                      <span
                        className={cm.cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-lg',
                        )}
                        style={{ backgroundColor: `${i.tint}22`, color: i.tint }}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base')}
                          aria-hidden="true"
                        >
                          {i.icon}
                        </span>
                      </span>
                      <div>
                        <p className={cm.cn('font-bold text-on-surface')}>{i.name}</p>
                        <p className={cm.cn('text-xs text-on-surface-variant')}>{i.desc}</p>
                      </div>
                    </div>
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-widest',
                      )}
                      style={{
                        backgroundColor: i.enabled
                          ? 'rgba(16, 185, 129, 0.18)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: i.enabled ? 'var(--color-link-hover)' : 'var(--color-chip-text)',
                      }}
                    >
                      {i.enabled
                        ? t('status.connected', {}, { defaultValue: 'Connected' })
                        : t('status.off', {}, { defaultValue: 'Off' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
                {t(
                  `settingsPage.section.${active}`,
                  {},
                  { defaultValue: SECTIONS.find((s) => s.key === active)?.defaultLabel ?? active },
                )}
              </h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                {t(
                  'settingsPage.placeholderBody',
                  {},
                  {
                    defaultValue:
                      'This section is coming soon. Defaults are applied workspace-wide today; per-workspace overrides will land in the next release.',
                  },
                )}
              </p>
              <div
                className={cm.cn('mt-6 rounded-xl p-5 font-mono text-xs text-on-surface-variant')}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--color-border-card)',
                }}
              >
                {/* Section settings are persisted client-side until /api/settings/{section} ships. */}
                {}$ {APP_NAME.toLowerCase()} config get {active}
                <br />
                {'{ "ok": true, "defaults": "in-place" }'}
              </div>
            </div>
          )}
        </div>
      </section>
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
    </div>
  )
}
