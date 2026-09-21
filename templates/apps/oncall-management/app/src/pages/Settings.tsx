import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { SeverityPill } from '../components/SeverityPill.js'

interface OrgIntegration {
  id: string
  user_id: string
  name: string
  detail: string
  connected: boolean
  created_at: string
}

interface OrgSettings {
  id: string
  user_id: string
  org_name: string
  region: string
  retention_days: number
  integrations: OrgIntegration[]
}

const SUGGESTED_INTEGRATIONS = ['Slack', 'PagerDuty', 'GitHub', 'Linear', 'Webhooks']

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orgNameDraft, setOrgNameDraft] = useState('')
  const [editingOrgName, setEditingOrgName] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [creatingIntegration, setCreatingIntegration] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletingWorkspace, setDeletingWorkspace] = useState(false)

  const reload = useCallback(async () => {
    try {
      const settingsRes = await http.get<OrgSettings>('/api/settings/me')
      setSettings(settingsRes.data ?? null)
    } catch (error) {
      logError('settings.reload', error)
      setError(t('settings.loadError', {}, { defaultValue: "Couldn't load settings." }))
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const saveOrgName = useCallback(async () => {
    setSavingSettings(true)
    try {
      await http.patch('/api/settings/me', { org_name: orgNameDraft.trim() })
      await reload()
      setEditingOrgName(false)
    } catch (error) {
      logError('settings.saveOrgName', error)
      setError(t('settings.saveError', {}, { defaultValue: "Couldn't save settings." }))
    } finally {
      setSavingSettings(false)
    }
  }, [http, orgNameDraft, reload, t])

  const addIntegration = useCallback(
    async (name: string) => {
      setCreatingIntegration(name)
      try {
        await http.post('/api/settings/integrations', {
          name,
          detail: t(
            'settings.integrationDefaultDetail',
            {},
            { defaultValue: 'Configure in your project settings.' },
          ),
          connected: true,
        })
        await reload()
      } catch (error) {
        logError('settings.addIntegration', error)
        setError(
          t('settings.integrationAddError', {}, { defaultValue: "Couldn't add integration." }),
        )
      } finally {
        setCreatingIntegration(null)
      }
    },
    [http, reload, t],
  )

  const toggleIntegration = useCallback(
    async (i: OrgIntegration) => {
      try {
        await http.put(`/api/settings/integrations/${i.id}`, { connected: !i.connected })
        await reload()
      } catch (error) {
        logError('settings.toggleIntegration', error)
        setError(
          t(
            'settings.integrationToggleError',
            {},
            { defaultValue: "Couldn't update integration." },
          ),
        )
      }
    },
    [http, reload, t],
  )

  const removeIntegration = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/settings/integrations/${id}`)
        await reload()
      } catch (error) {
        logError('settings.removeIntegration', error)
        setError(
          t(
            'settings.integrationRemoveError',
            {},
            { defaultValue: "Couldn't remove integration." },
          ),
        )
      }
    },
    [http, reload, t],
  )

  const deleteWorkspace = useCallback(async () => {
    setDeletingWorkspace(true)
    try {
      await http.delete('/api/settings/workspace')
      await reload()
      setConfirmingDelete(false)
    } catch (error) {
      logError('settings.deleteWorkspace', error)
      setError(t('settings.deleteError', {}, { defaultValue: "Couldn't delete workspace." }))
    } finally {
      setDeletingWorkspace(false)
    }
  }, [http, reload, t])

  const integrations = settings?.integrations ?? []
  const presentIntegrationNames = new Set(integrations.map((i) => i.name))
  const suggested = SUGGESTED_INTEGRATIONS.filter((n) => !presentIntegrationNames.has(n))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t(
            'settings.eyebrow',
            { app: APP_NAME.toLowerCase() },
            { defaultValue: '$ {{app}} settings --org' },
          )}
        </p>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('settings.subheading', {}, { defaultValue: 'Integrations and team-wide defaults.' })}
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="settings-error"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      <section className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-12')}>
        <div className={cm.cn('min-w-0 lg:col-span-7 space-y-6')}>
          <section
            className={cm.cn('rounded-2xl p-6')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('text-sm font-mono font-black uppercase tracking-widest mb-4')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('settings.integrations', {}, { defaultValue: '// integrations' })}
            </h2>
            {integrations.length === 0 ? (
              <p
                data-testid="integrations-empty"
                className={cm.cn('font-mono text-xs')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t(
                  'settings.noIntegrations',
                  {},
                  {
                    defaultValue:
                      'No integrations yet — connect Slack, PagerDuty, or GitHub below.',
                  },
                )}
              </p>
            ) : (
              <ul
                data-testid="integrations-list"
                className={cm.cn('divide-y')}
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                {integrations.map((i) => (
                  <li
                    key={i.id}
                    data-testid="integration-row"
                    className={cm.cn('flex items-center gap-3 py-3 first:pt-0')}
                  >
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <p
                        className={cm.cn('text-sm font-bold')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {i.name}
                      </p>
                      <p
                        className={cm.cn('font-mono text-xs')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {i.detail}
                      </p>
                    </div>
                    <SeverityPill
                      severity={i.connected ? 'resolved' : 'ignored'}
                      label={
                        i.connected
                          ? t('status.connected', {}, { defaultValue: 'Connected' })
                          : t('settings.disconnected', {}, { defaultValue: 'Disconnected' })
                      }
                    />
                    <button
                      type="button"
                      data-testid="integration-toggle"
                      onClick={() => void toggleIntegration(i)}
                      className={cm.cn(
                        'font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
                      )}
                      style={{
                        color: i.connected
                          ? 'var(--color-severity-critical)'
                          : 'var(--color-text-code)',
                      }}
                    >
                      {i.connected
                        ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                        : t('common.connect', {}, { defaultValue: 'Connect' })}
                    </button>
                    <button
                      type="button"
                      data-testid="integration-remove"
                      onClick={() => void removeIntegration(i.id)}
                      className={cm.cn(
                        'font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
                      )}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {suggested.length > 0 ? (
              <div className={cm.cn('mt-4 flex flex-wrap gap-2')}>
                {suggested.map((name) => (
                  <button
                    type="button"
                    key={name}
                    data-testid={`add-integration-${name.toLowerCase()}`}
                    disabled={creatingIntegration === name}
                    onClick={() => void addIntegration(name)}
                    className={cm.cn(
                      'px-3 py-1.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-widest border disabled:opacity-50',
                    )}
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-info) 30%, transparent)',
                      color: 'var(--color-text-code)',
                    }}
                  >
                    {creatingIntegration === name ? '…' : `+ ${name}`}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className={cm.cn('min-w-0 lg:col-span-5 space-y-6')}>
          <section
            className={cm.cn('rounded-2xl p-6')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('text-sm font-mono font-black uppercase tracking-widest mb-4')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('settings.workspace', {}, { defaultValue: '// workspace' })}
            </h2>
            <dl className={cm.cn('space-y-3')}>
              {editingOrgName ? (
                <div className={cm.cn('flex items-center gap-2')}>
                  <span
                    className={cm.cn(
                      'font-mono text-[10px] font-black uppercase tracking-widest w-32 shrink-0',
                    )}
                    style={{ color: 'var(--color-severity-muted)' }}
                  >
                    {t('settings.orgName', {}, { defaultValue: 'Org name' })}
                  </span>
                  <input
                    data-testid="org-name-input"
                    value={orgNameDraft}
                    onChange={(e) => setOrgNameDraft(e.target.value)}
                    className={cm.cn('flex-1 px-2 py-1 rounded font-mono text-sm')}
                    style={{
                      backgroundColor: 'var(--color-background-secondary)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <button
                    type="button"
                    data-testid="org-name-save"
                    onClick={() => void saveOrgName()}
                    disabled={savingSettings}
                    className={cm.cn(
                      'font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded disabled:opacity-50',
                    )}
                    style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                  >
                    {savingSettings ? '…' : t('common.save', {}, { defaultValue: 'Save' })}
                  </button>
                </div>
              ) : (
                <FieldRow
                  label={t('settings.orgName', {}, { defaultValue: 'Org name' })}
                  value={
                    settings?.org_name ||
                    t('settings.orgNameUnset', {}, { defaultValue: 'Untitled workspace' })
                  }
                  mono
                  action={t('common.edit', {}, { defaultValue: 'Edit' })}
                  onAction={() => {
                    setOrgNameDraft(settings?.org_name ?? '')
                    setEditingOrgName(true)
                  }}
                  actionTestId="org-name-edit"
                />
              )}
              <FieldRow
                label={t('settings.region', {}, { defaultValue: 'Region' })}
                value={settings?.region ?? 'us-east-1'}
                mono
              />
              <FieldRow
                label={t('settings.retention', {}, { defaultValue: 'Retention' })}
                value={t(
                  'settings.retentionDays',
                  { count: settings?.retention_days ?? 30 },
                  { defaultValue: '{{count}} days' },
                )}
              />
              <FieldRow
                label={t('nav.plan', {}, { defaultValue: 'Plan' })}
                value={t('nav.free', {}, { defaultValue: 'Free' })}
                valueStyle={{ color: BRAND_COLOR }}
              />
            </dl>
          </section>

          <section
            className={cm.cn('rounded-2xl p-6')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('text-sm font-mono font-black uppercase tracking-widest mb-2')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('settings.language.title', {}, { defaultValue: '// language' })}
            </h2>
            <p className={cm.cn('text-sm mb-4')} style={{ color: 'var(--color-text-secondary)' }}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>

          <section
            className={cm.cn('rounded-2xl p-6')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('text-sm font-mono font-black uppercase tracking-widest mb-2')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('settings.appearance', {}, { defaultValue: '// appearance' })}
            </h2>
            <p className={cm.cn('text-sm mb-4')} style={{ color: 'var(--color-text-secondary)' }}>
              {t(
                'common.toggleLightDark',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
            <ThemeToggle />
          </section>
          <section
            className={cm.cn('rounded-2xl p-6')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('text-sm font-mono font-black uppercase tracking-widest mb-4')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('settings.danger', {}, { defaultValue: '// danger zone' })}
            </h2>
            <p className={cm.cn('text-sm mb-4')} style={{ color: 'var(--color-text-secondary)' }}>
              {t(
                'settings.dangerCopy',
                {},
                {
                  defaultValue:
                    'Permanently delete all of the incidents, schedules, escalation policies, postmortems, and paging history in this workspace. Your account stays.',
                },
              )}
            </p>
            {confirmingDelete ? (
              <div className={cm.cn('space-y-3')}>
                <p
                  className={cm.cn('font-mono text-xs')}
                  style={{ color: 'var(--color-severity-critical)' }}
                >
                  {t(
                    'settings.dangerConfirm',
                    {},
                    { defaultValue: 'This cannot be undone — confirm to wipe.' },
                  )}
                </p>
                <div className={cm.cn('flex items-center gap-2')}>
                  <button
                    type="button"
                    data-testid="delete-workspace-confirm"
                    disabled={deletingWorkspace}
                    onClick={() => void deleteWorkspace()}
                    className={cm.cn(
                      'font-mono text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-md disabled:opacity-50',
                    )}
                    style={{
                      backgroundColor: 'var(--color-severity-critical)',
                      color: 'var(--color-on-error)',
                    }}
                  >
                    {deletingWorkspace
                      ? '…'
                      : t('settings.dangerYes', {}, { defaultValue: 'Yes, wipe it' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className={cm.cn(
                      'font-mono text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-md hover:bg-white/5',
                    )}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                type="button"
                data-testid="delete-workspace-open"
                className={cm.cn(
                  'font-mono text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-md transition-colors hover:opacity-90',
                )}
                style={{
                  backgroundColor: 'var(--color-severity-critical-light)',
                  color: 'var(--color-severity-critical)',
                  border: '1px solid var(--color-severity-critical)',
                }}
              >
                {t('settings.deleteWorkspace', {}, { defaultValue: 'Delete workspace data' })}
              </button>
            )}
          </section>
        </aside>
      </section>
    </div>
  )
}

function FieldRow({
  label,
  value,
  mono = false,
  valueStyle,
  action,
  onAction,
  actionTestId,
}: {
  label: string
  value: string
  mono?: boolean
  valueStyle?: React.CSSProperties
  action?: string
  onAction?: () => void
  actionTestId?: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex items-center gap-3')}>
      <span
        className={cm.cn(
          'font-mono text-[10px] font-black uppercase tracking-widest w-32 shrink-0',
        )}
        style={{ color: 'var(--color-severity-muted)' }}
      >
        {label}
      </span>
      <span
        className={mono ? 'font-mono text-sm' : 'text-sm'}
        style={{ color: 'var(--color-text)', ...(valueStyle ?? {}) }}
      >
        {value}
      </span>
      {action ? (
        <button
          type="button"
          data-testid={actionTestId}
          onClick={onAction}
          className={cm.cn(
            'ml-auto font-mono text-[10px] font-bold uppercase tracking-widest hover:opacity-80',
          )}
          style={{ color: 'var(--color-text-code)' }}
        >
          {action}
        </button>
      ) : null}
    </div>
  )
}
