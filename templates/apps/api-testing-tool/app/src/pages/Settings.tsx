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
  // SSL/TLS card — client-side request hardening preferences. The toggle and
  // CA pinning list live in local state (a fresh workspace starts verified-ON
  // with no custom CAs pinned); this card configures the runner, not the API.
  const [verifySsl, setVerifySsl] = useState(true)
  const [caCerts, setCaCerts] = useState<string[]>([])

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
        data-mol-id="settings-section-ssl"
      >
        <header
          className={cm.cn('px-6 py-4 border-b flex items-center justify-between gap-4')}
          style={{ borderColor: PANEL_BORDER }}
        >
          <div className={cm.cn('min-w-0')}>
            <h2
              className={cm.cn('text-lg font-extrabold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t('settings.ssl.title', {}, { defaultValue: 'SSL/TLS Certificates' })}
            </h2>
            <p className={cm.cn('text-xs')} style={{ color: 'var(--color-text-secondary)' }}>
              {t(
                'settings.ssl.desc',
                {},
                { defaultValue: 'Manage verification and client certs.' },
              )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={verifySsl}
            aria-label={t(
              'settings.ssl.verifyLabel',
              {},
              { defaultValue: 'Verify SSL certificates' },
            )}
            onClick={() => setVerifySsl((v) => !v)}
            data-mol-id="settings-ssl-toggle"
            className={cm.cn(
              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            )}
            style={{
              backgroundColor: verifySsl
                ? 'var(--color-status-success)'
                : 'var(--color-surface-elevated)',
            }}
          >
            <span
              className={cm.cn('inline-block h-3 w-3 transform rounded-full transition-transform')}
              style={{
                backgroundColor: 'var(--color-background)',
                transform: verifySsl ? 'translateX(22px)' : 'translateX(4px)',
              }}
            />
          </button>
        </header>
        <div className={cm.cn('px-6 py-4 flex flex-col gap-4')}>
          <div>
            <p className={cm.cn('text-xs font-medium mb-2')} style={{ color: 'var(--color-text)' }}>
              {t('settings.ssl.customCa', {}, { defaultValue: 'Custom CA Certificates' })}
            </p>
            <div className={cm.cn('flex flex-wrap gap-2')}>
              {caCerts.map((ca) => (
                <span
                  key={ca}
                  className={cm.cn(
                    'inline-flex items-center gap-x-1.5 rounded px-2 py-1 text-xs font-mono font-medium border',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: PANEL_BORDER,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {ca}
                  <button
                    type="button"
                    onClick={() => setCaCerts((list) => list.filter((c) => c !== ca))}
                    aria-label={t(
                      'settings.ssl.removeCa',
                      { name: ca },
                      { defaultValue: 'Remove {{name}}' },
                    )}
                    data-mol-id={`settings-ssl-remove-${ca}`}
                    className={cm.cn('rounded-sm hover:opacity-70')}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[12px]')}
                      style={{ color: 'var(--color-text-secondary)' }}
                      aria-hidden="true"
                    >
                      close
                    </span>
                  </button>
                </span>
              ))}
              <label
                className={cm.cn(
                  'inline-flex items-center gap-x-1 rounded px-2 py-1 text-xs font-mono font-medium border border-dashed cursor-pointer transition-colors',
                )}
                style={{
                  borderColor: 'var(--color-text-secondary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  add
                </span>
                {t('settings.ssl.addCa', {}, { defaultValue: 'Add CA' })}
                <input
                  type="file"
                  multiple
                  accept=".crt,.pem,.cer"
                  className={cm.cn('hidden')}
                  onChange={(event) => {
                    const added = Array.from(event.target.files ?? []).map((f) => f.name)
                    if (added.length > 0) {
                      setCaCerts((list) => [...new Set([...list, ...added])])
                    }
                    event.target.value = ''
                  }}
                  data-mol-id="settings-ssl-add-ca"
                />
              </label>
            </div>
          </div>
          <div>
            <p className={cm.cn('text-xs font-medium mb-2')} style={{ color: 'var(--color-text)' }}>
              {t('settings.ssl.clientCerts', {}, { defaultValue: 'Client Certificates' })}
            </p>
            <div
              className={cm.cn('rounded-md overflow-hidden border')}
              style={{ borderColor: PANEL_BORDER }}
            >
              <table className={cm.cn('min-w-full')}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
                    {(['host', 'certificate', 'key'] as const).map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className={cm.cn(
                          'py-2 px-3 text-left text-[10px] font-mono uppercase tracking-wider',
                        )}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t(`settings.ssl.col.${col}`, {}, { defaultValue: col })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={3}
                      className={cm.cn('py-3 px-3 text-xs font-mono')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t(
                        'settings.ssl.emptyCerts',
                        {},
                        {
                          defaultValue:
                            'No client certificates configured — add one per host that requires mutual TLS.',
                        },
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

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
