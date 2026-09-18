import { useCallback, useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { SURFACE_PANEL } from '../branding.js'

const PANEL_BORDER = 'var(--color-border)'

interface EnvRow {
  id: string
  name?: string
  is_active?: boolean
}

interface CountRow {
  id: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile & { email?: string; name?: string }>()
  const [activeEnvName, setActiveEnvName] = useState<string | null>(null)
  const [counts, setCounts] = useState<{
    collections?: number
    mocks?: number
    monitors?: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Settings is a routed page, not a dismissible panel. SettingsContainer
  // requires an onClose for its children; the log-out / delete-account
  // sections navigate to /login themselves after the action completes, so
  // a no-op is the correct close handler here.
  const handleClose = useCallback(() => {}, [])

  const load = async () => {
    try {
      const [envs, cols, mocks, mons] = await Promise.all([
        http.get<EnvRow[]>('/api/environments').catch(() => ({ data: [] as EnvRow[] })),
        http.get<CountRow[]>('/api/collections').catch(() => ({ data: [] as CountRow[] })),
        http.get<CountRow[]>('/api/mocks').catch(() => ({ data: [] as CountRow[] })),
        http.get<CountRow[]>('/api/monitors').catch(() => ({ data: [] as CountRow[] })),
      ])
      const envList = Array.isArray(envs.data) ? envs.data : []
      const active = envList.find((e) => e.is_active) ?? envList[0] ?? null
      setActiveEnvName(active?.name ?? null)
      setCounts({
        collections: Array.isArray(cols.data) ? cols.data.length : 0,
        mocks: Array.isArray(mocks.data) ? mocks.data.length : 0,
        monitors: Array.isArray(mons.data) ? mons.data.length : 0,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.fetchError', {}, { defaultValue: 'Could not load settings.' }),
      )
    }
  }

  useEffect(() => {
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cast = user as { name?: string; email?: string } | null
  const displayName = cast?.name ?? cast?.email ?? ''
  const email = cast?.email ?? ''

  const handleSeed = async () => {
    if (busy) return
    setBusy(true)
    try {
      // Seed a starter collection + environment so the workspace isn't empty.
      const ts = new Date().toISOString()
      await http
        .post('/api/collections', {
          name: t('settings.starterCollection', {}, { defaultValue: 'Starter collection' }),
          description: t(
            'settings.starterCollectionDesc',
            { ts },
            { defaultValue: 'Created from Settings on {{ts}}' },
          ),
        })
        .catch(() => null)
      await http
        .post('/api/environments', {
          name: t('settings.starterEnv', {}, { defaultValue: 'Starter env' }),
          variables: [
            { key: 'BASE_URL', value: 'https://api.example.com' },
            { key: 'API_TOKEN', value: 'replace-me' },
          ],
          is_active: true,
        })
        .catch(() => null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const sections: {
    key: string
    defaultLabel: string
    defaultDescription: string
    icon: string
    rows: { key: string; defaultLabel: string; value: string; secret?: boolean }[]
  }[] = [
    {
      key: 'account',
      defaultLabel: 'Account',
      defaultDescription: 'Identity and personal preferences for this workspace.',
      icon: 'badge',
      rows: [
        {
          key: 'name',
          defaultLabel: 'Display name',
          value: displayName || t('settings.unset', {}, { defaultValue: 'not set' }),
        },
        {
          key: 'email',
          defaultLabel: 'Email',
          value: email || t('settings.unset', {}, { defaultValue: 'not set' }),
        },
        {
          key: 'timezone',
          defaultLabel: 'Timezone',
          value:
            typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
        },
      ],
    },
    {
      key: 'workspace',
      defaultLabel: 'Workspace',
      defaultDescription: 'Counts of resources owned by this account.',
      icon: 'workspaces',
      rows: [
        {
          key: 'collections',
          defaultLabel: 'Collections',
          value: counts?.collections == null ? '—' : String(counts.collections),
        },
        {
          key: 'mocks',
          defaultLabel: 'Mock servers',
          value: counts?.mocks == null ? '—' : String(counts.mocks),
        },
        {
          key: 'monitors',
          defaultLabel: 'Monitors',
          value: counts?.monitors == null ? '—' : String(counts.monitors),
        },
      ],
    },
    {
      key: 'environment',
      defaultLabel: 'Active environment',
      defaultDescription: 'The variable set merged into outgoing requests.',
      icon: 'cloud',
      rows: [
        {
          key: 'active',
          defaultLabel: 'Active',
          value: activeEnvName ?? t('settings.unset', {}, { defaultValue: 'none' }),
        },
      ],
    },
  ]

  return (
    <div className={cm.cn('p-6')}>
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: 'var(--color-primary)' }}
        >
          {t('settings.eyebrow', {}, { defaultValue: '$ pylon settings --edit' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'A read-only view of the data this account currently owns.' },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn('mb-4 text-sm')} style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      ) : null}

      <div className={cm.cn('grid gap-5 grid-cols-1 lg:grid-cols-2')}>
        {sections.map((section) => (
          <section
            key={section.key}
            className={cm.cn('rounded-2xl overflow-hidden')}
            style={{
              backgroundColor: SURFACE_PANEL,
              border: `1px solid ${PANEL_BORDER}`,
            }}
            data-mol-id={`settings-section-${section.key}`}
          >
            <header
              className={cm.cn('px-6 py-4 border-b flex items-center gap-3')}
              style={{ borderColor: PANEL_BORDER }}
            >
              <span
                className={cm.cn('inline-flex items-center justify-center h-9 w-9 rounded-lg')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                  color: 'var(--color-primary)',
                }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>{section.icon}</span>
              </span>
              <div className={cm.cn('flex-1 min-w-0')}>
                <h2
                  className={cm.cn('text-lg font-extrabold tracking-tight')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(`settings.${section.key}.label`, {}, { defaultValue: section.defaultLabel })}
                </h2>
                <p className={cm.cn('text-xs')} style={{ color: 'var(--color-text-secondary)' }}>
                  {t(
                    `settings.${section.key}.desc`,
                    {},
                    { defaultValue: section.defaultDescription },
                  )}
                </p>
              </div>
            </header>
            <ul>
              {section.rows.map((row) => (
                <li
                  key={row.key}
                  className={cm.cn(
                    'grid grid-cols-[140px_1fr] gap-4 items-center px-6 py-3 border-b last:border-b-0',
                  )}
                  style={{ borderColor: PANEL_BORDER }}
                >
                  <span
                    className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t(
                      `settings.${section.key}.${row.key}.label`,
                      {},
                      { defaultValue: row.defaultLabel },
                    )}
                  </span>
                  <span
                    className={cm.cn('font-mono text-sm truncate')}
                    style={{
                      color: row.secret ? 'var(--color-method-patch)' : 'var(--color-text-primary)',
                    }}
                  >
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section
        className={cm.cn('mt-6 rounded-2xl overflow-hidden')}
        style={{
          backgroundColor: SURFACE_PANEL,
          border: `1px solid ${PANEL_BORDER}`,
        }}
        data-mol-id="settings-section-account-management"
      >
        <header
          className={cm.cn('px-6 py-4 border-b flex items-center gap-3')}
          style={{ borderColor: PANEL_BORDER }}
        >
          <span
            className={cm.cn('inline-flex items-center justify-center h-9 w-9 rounded-lg')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
              color: 'var(--color-primary)',
            }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-xl')}>manage_accounts</span>
          </span>
          <div className={cm.cn('flex-1 min-w-0')}>
            <h2
              className={cm.cn('text-lg font-extrabold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t('settings.accountManagement.title', {}, { defaultValue: 'Account & security' })}
            </h2>
            <p className={cm.cn('text-xs')} style={{ color: 'var(--color-text-secondary)' }}>
              {t(
                'settings.accountManagement.desc',
                {},
                {
                  defaultValue:
                    'Update your email and password, manage notifications and devices, sign out, or delete your account.',
                },
              )}
            </p>
          </div>
        </header>
        <SettingsContainer onClose={handleClose}>
          <AccountSection />
          <AuthSection />
          <NotificationsSection />
          <DevicesSection />
          <ThisDeviceSection />
          <LogOutDeleteSection />
        </SettingsContainer>
      </section>

      <section
        className={cm.cn('mt-6 rounded-2xl overflow-hidden')}
        style={{
          backgroundColor: SURFACE_PANEL,
          border: `1px solid ${PANEL_BORDER}`,
        }}
        data-mol-id="settings-section-language"
      >
        <header
          className={cm.cn('px-6 py-4 border-b flex items-center gap-3')}
          style={{ borderColor: PANEL_BORDER }}
        >
          <span
            className={cm.cn('inline-flex items-center justify-center h-9 w-9 rounded-lg')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
              color: 'var(--color-primary)',
            }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-xl')}>language</span>
          </span>
          <div className={cm.cn('flex-1 min-w-0')}>
            <h2
              className={cm.cn('text-lg font-extrabold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t('settings.language.title', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn('text-xs')} style={{ color: 'var(--color-text-secondary)' }}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
          </div>
        </header>
        <div className={cm.cn('px-6 py-4')}>
          <LanguagePicker />
        </div>
      </section>

      <section
        className={cm.cn('mt-6 rounded-2xl overflow-hidden')}
        style={{
          backgroundColor: SURFACE_PANEL,
          border: `1px solid ${PANEL_BORDER}`,
        }}
        data-mol-id="settings-section-appearance"
      >
        <header
          className={cm.cn('px-6 py-4 border-b flex items-center gap-3')}
          style={{ borderColor: PANEL_BORDER }}
        >
          <span
            className={cm.cn('inline-flex items-center justify-center h-9 w-9 rounded-lg')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
              color: 'var(--color-primary)',
            }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-xl')}>dark_mode</span>
          </span>
          <div className={cm.cn('flex-1 min-w-0')}>
            <h2
              className={cm.cn('text-lg font-extrabold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
            </h2>
            <p className={cm.cn('text-xs')} style={{ color: 'var(--color-text-secondary)' }}>
              {t(
                'common.toggleLightDark',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
          </div>
        </header>
        <div className={cm.cn('px-6 py-4')}>
          <ThemeToggle />
        </div>
      </section>
      <div className={cm.cn('mt-6')}>
        <button
          type="button"
          onClick={handleSeed}
          disabled={busy}
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-all hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60',
          )}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            boxShadow: '0 8px 22px -10px color-mix(in srgb, var(--color-primary) 60%, transparent)',
          }}
          data-mol-id="settings-seed"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            auto_awesome
          </span>
          {busy
            ? t('settings.seeding', {}, { defaultValue: 'Seeding…' })
            : t('settings.seedStarter', {}, { defaultValue: 'Seed starter content' })}
        </button>
      </div>
    </div>
  )
}
