import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { StatusPill } from '../components/StatusPill.js'
import { CHANNEL_DEFS, parseObj, resolveChannelPrefs } from '../lib/notification-channels.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'
const FIELD_BORDER = 'var(--mol-color-border)'

const TABS = [
  { key: 'general', defaultLabel: 'General', to: '/settings' },
  { key: 'api-keys', defaultLabel: 'API keys', to: '/settings/api-keys' },
  { key: 'team', defaultLabel: 'Team', to: '/settings/team' },
  { key: 'billing', defaultLabel: 'Billing', to: '/settings/billing' },
] as const

export function SettingsTabs({ active }: { active: (typeof TABS)[number]['key'] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <nav
      className={cm.cn('flex items-center gap-1 mb-6 overflow-x-auto')}
      style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}
      aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            to={tab.to}
            className={cm.cn(
              'inline-flex items-center px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors',
            )}
            style={{
              color: isActive ? 'var(--mol-color-primary)' : 'var(--mol-color-text-secondary)',
              borderBottom: isActive ? `2px solid ${BRAND_COLOR}` : '2px solid transparent',
              marginBottom: '-1px',
            }}
            data-mol-id={`settings-tab-${tab.key}`}
          >
            {t(`settings.tab.${tab.key}`, {}, { defaultValue: tab.defaultLabel })}
          </Link>
        )
      })}
    </nav>
  )
}

interface ApiUser {
  id: string
  preferences?: unknown
}

interface WorkspacePrefs {
  workspaceName?: string
  region?: 'us-east' | 'eu-west' | 'ap-southeast'
  retention?: '7d' | '30d' | '90d'
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { data: user, refetch } = useApi<ApiUser>('/profile')

  const [workspaceName, setWorkspaceName] = useState('')
  const [region, setRegion] = useState<'us-east' | 'eu-west' | 'ap-southeast'>('us-east')
  const [retention, setRetention] = useState<'7d' | '30d' | '90d'>('30d')
  const [channels, setChannels] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hydratedFromUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    // Hydrate state from server data once per user identity. Subsequent
    // refetches (e.g. after a save) leave local edits intact — without this
    // guard a refetch could clobber what the user just typed.
    if (hydratedFromUserRef.current === user.id) return
    hydratedFromUserRef.current = user.id
    const prefs = parseObj<Record<string, unknown>>(user.preferences)
    const ws = parseObj<WorkspacePrefs>(prefs.workspace)
    setWorkspaceName(typeof ws.workspaceName === 'string' ? ws.workspaceName : '')
    setRegion(ws.region ?? 'us-east')
    setRetention(ws.retention ?? '30d')

    // Channels are saved into preferences.notification_channels (see save());
    // read them back from the SAME key. This used to read a top-level
    // notification_prefs column that nothing ever wrote, so saved toggles
    // silently reverted to defaults on every reload.
    setChannels(resolveChannelPrefs(user.preferences))
  }, [user])

  const hydrated = hydratedFromUserRef.current !== null && !!user?.id

  const toggleChannel = (id: string) => {
    setChannels((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const client = getHttpClient()
      const existingPrefs = parseObj<Record<string, unknown>>(user?.preferences)
      await client.patch('/profile', {
        preferences: {
          ...existingPrefs,
          workspace: { workspaceName, region, retention },
          notification_channels: channels,
        },
      })
      setSavedAt(Date.now())
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const deleteWorkspace = async () => {
    const text = window.prompt(
      t(
        'settings.deleteWorkspaceConfirm',
        {},
        {
          defaultValue:
            'Type DELETE to confirm. This deletes ALL endpoints, deliveries, and audit history.',
        },
      ),
    )
    if (text !== 'DELETE') return
    try {
      const client = getHttpClient()
      // Best-effort: delete every webhook the user owns. The audit entries
      // remain (intentional). The user account itself stays so they can
      // restart the workspace from scratch.
      const res = await client.get<Array<{ id: string }>>('/webhooks?limit=500')
      const webhooks = res.data ?? []
      await Promise.all(webhooks.map((w) => client.delete(`/webhooks/${w.id}`)))
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  const activeCount = Object.values(channels).filter(Boolean).length

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-5xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="settings-root"
    >
      <div className={cm.cn('mb-6')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'workspace · configuration' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p
          className={cm.cn('mt-2 text-sm max-w-xl')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'settings.body',
            {},
            {
              defaultValue:
                'Workspace-level controls — change them carefully and check the audit log after.',
            },
          )}
        </p>
      </div>

      <SettingsTabs active="general" />

      {error && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      {!hydrated && (
        <section
          className={cm.cn('rounded-xl p-6 mb-6 text-sm font-mono')}
          style={{
            backgroundColor: PANEL_BG,
            border: `1px solid ${PANEL_BORDER}`,
            color: 'var(--mol-color-text-secondary)',
          }}
          data-mol-id="settings-loading"
        >
          {t('settings.loading', {}, { defaultValue: 'Loading workspace settings…' })}
        </section>
      )}

      {hydrated && (
        <>
          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="settings-workspace"
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-4')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
            </h2>

            <label
              className={cm.cn(
                'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
              )}
              style={{ color: 'var(--mol-color-text-secondary)' }}
              htmlFor="ws-name"
            >
              {t('settings.workspaceName', {}, { defaultValue: 'Workspace name' })}
            </label>
            <input
              id="ws-name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder={t(
                'settings.workspaceNamePlaceholder',
                {},
                { defaultValue: 'e.g. Acme Engineering' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                'rounded-md text-sm transition-colors',
              )}
              style={{
                backgroundColor: 'var(--mol-color-background-secondary)',
                border: `1px solid ${FIELD_BORDER}`,
                color: 'var(--mol-color-text)',
              }}
              data-mol-id="settings-workspace-name"
            />

            <p
              className={cm.cn(
                'block font-mono text-[10px] font-black uppercase tracking-widest mt-5 mb-2',
              )}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t('settings.region', {}, { defaultValue: 'Delivery region' })}
            </p>
            <div className={cm.cn('grid gap-3 grid-cols-1 sm:grid-cols-3')}>
              {(['us-east', 'eu-west', 'ap-southeast'] as const).map((r) => {
                const active = region === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={cm.cn(
                      'flex items-start flex-col text-left p-4 rounded-md transition-colors',
                    )}
                    style={{
                      backgroundColor: active
                        ? 'color-mix(in srgb, var(--mol-color-primary) 10%, transparent)'
                        : 'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                      border: `1px solid ${active ? 'color-mix(in srgb, var(--mol-color-primary) 40%, transparent)' : FIELD_BORDER}`,
                    }}
                    data-mol-id={`settings-region-${r}`}
                  >
                    <span
                      className={cm.cn(
                        'font-mono text-[10px] font-black uppercase tracking-widest',
                      )}
                      style={{
                        color: active
                          ? 'var(--mol-color-primary)'
                          : 'var(--mol-color-text-secondary)',
                      }}
                    >
                      {t(`settings.region.${r}`, {}, { defaultValue: r })}
                    </span>
                    <span
                      className={cm.cn('mt-1 text-sm')}
                      style={{ color: 'var(--mol-color-text-secondary)' }}
                    >
                      {t(
                        `settings.region.${r}.detail`,
                        {},
                        {
                          defaultValue:
                            r === 'us-east'
                              ? 'iad1 · 18ms median to AWS us-east-1'
                              : r === 'eu-west'
                                ? 'fra1 · 22ms median to EU APIs'
                                : 'syd1 · 28ms median to APAC',
                        },
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="settings-retention"
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-4')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('settings.retention', {}, { defaultValue: 'Delivery retention' })}
            </h2>
            <p
              className={cm.cn('text-sm mb-4')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'settings.retentionBody',
                { app: APP_NAME },
                {
                  defaultValue:
                    'How long {{app}} keeps full request/response payloads in the searchable log. Audit entries are retained forever.',
                },
              )}
            </p>
            <div className={cm.cn('flex items-center gap-2')}>
              {(['7d', '30d', '90d'] as const).map((r) => {
                const active = retention === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRetention(r)}
                    className={cm.cn(
                      'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-colors',
                    )}
                    style={{
                      backgroundColor: active
                        ? 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)'
                        : 'transparent',
                      color: active
                        ? 'var(--mol-color-primary)'
                        : 'var(--mol-color-text-secondary)',
                      boxShadow: active
                        ? 'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-primary) 35%, transparent)'
                        : `inset 0 0 0 1px ${FIELD_BORDER}`,
                    }}
                    data-mol-id={`settings-retention-${r}`}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
          </section>

          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="settings-channels"
          >
            <div className={cm.cn('flex items-center justify-between flex-wrap gap-2 mb-4')}>
              <h2
                className={cm.cn('text-base font-extrabold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t('settings.notifications', {}, { defaultValue: 'Notification channels' })}
              </h2>
              <StatusPill status="live" label={`${activeCount} ACTIVE`} />
            </div>
            <ul className={cm.cn('flex flex-col gap-2')}>
              {CHANNEL_DEFS.map((c) => {
                const enabled = channels[c.id] ?? c.defaultEnabled
                return (
                  <li
                    key={c.id}
                    className={cm.cn('flex items-center gap-3 px-4 py-3 rounded-md')}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                      border: `1px solid ${FIELD_BORDER}`,
                    }}
                    data-mol-id={`settings-channel-${c.id}`}
                  >
                    <span
                      className={cm.cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-md',
                      )}
                      style={{
                        backgroundColor: enabled
                          ? 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)'
                          : 'color-mix(in srgb, var(--mol-color-text-secondary) 10%, transparent)',
                        color: enabled
                          ? 'var(--mol-color-primary)'
                          : 'var(--mol-color-text-secondary)',
                      }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        {c.icon}
                      </span>
                    </span>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <p
                        className={cm.cn('text-sm font-bold')}
                        style={{ color: 'var(--mol-color-text)' }}
                      >
                        {t(`settings.channel.${c.id}.label`, {}, { defaultValue: c.defaultLabel })}
                      </p>
                      <p
                        className={cm.cn('text-xs')}
                        style={{ color: 'var(--mol-color-text-secondary)' }}
                      >
                        {t(
                          `settings.channel.${c.id}.description`,
                          {},
                          { defaultValue: c.description },
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleChannel(c.id)}
                      className={cm.cn(
                        'inline-flex h-6 w-11 rounded-full transition-colors items-center px-0.5',
                      )}
                      style={{
                        backgroundColor: enabled
                          ? BRAND_COLOR
                          : 'color-mix(in srgb, var(--mol-color-text-secondary) 25%, transparent)',
                      }}
                      aria-pressed={enabled}
                      aria-label={t(
                        'settings.toggleChannel',
                        { channel: c.defaultLabel },
                        { defaultValue: 'Toggle {{channel}}' },
                      )}
                      data-mol-id={`settings-channel-toggle-${c.id}`}
                    >
                      <span
                        className={cm.cn(
                          'h-5 w-5 rounded-full transition-transform bg-white shadow',
                        )}
                        style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="settings-language"
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-2')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p
              className={cm.cn('text-sm mb-4')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>

          <section
            className={cm.cn('rounded-xl p-6 mb-6')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            data-mol-id="settings-appearance"
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-2')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
            </h2>
            <p
              className={cm.cn('text-sm mb-4')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'common.toggleLightDark',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
            <ThemeToggle />
          </section>
          <div className={cm.cn('flex items-center justify-end gap-3 mb-6')}>
            {savedAt && Date.now() - savedAt < 4000 && (
              <span
                className={cm.cn('font-mono text-[11px]')}
                style={{ color: 'var(--mol-color-success)' }}
                data-mol-id="settings-saved-toast"
              >
                {t('settings.saved', {}, { defaultValue: '✓ saved' })}
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={cm.cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono font-semibold text-sm transition-all hover:opacity-90 shadow-lg disabled:opacity-60',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-on-primary)',
                boxShadow:
                  '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
              }}
              data-mol-id="settings-save"
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.save', {}, { defaultValue: 'Save settings' })}
            </button>
          </div>
        </>
      )}

      <section
        className={cm.cn('rounded-xl p-6')}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 6%, transparent)',
          border: '1px solid color-mix(in srgb, var(--mol-color-error) 30%, transparent)',
        }}
        data-mol-id="settings-danger-zone"
      >
        <h2
          className={cm.cn('text-base font-extrabold tracking-tight mb-2')}
          style={{ color: 'var(--mol-color-error)' }}
        >
          {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn('text-sm mb-4')} style={{ color: 'var(--mol-color-text-secondary)' }}>
          {t(
            'settings.dangerBody',
            {},
            {
              defaultValue:
                'Deleting a workspace stops all deliveries immediately and purges payload history within 24 hours. Audit entries are kept indefinitely.',
            },
          )}
        </p>
        <button
          type="button"
          onClick={deleteWorkspace}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
          )}
          style={{
            border: '1px solid color-mix(in srgb, var(--mol-color-error) 45%, transparent)',
            color: 'var(--mol-color-error)',
          }}
          data-mol-id="settings-delete-workspace"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            delete_forever
          </span>
          {t('settings.deleteWorkspace', {}, { defaultValue: 'Delete workspace' })}
        </button>
      </section>
    </div>
  )
}
