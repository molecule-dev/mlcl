import { type FormEvent, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['account', 'repositories', 'webhooks', 'secrets', 'team', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface Profile {
  id: string
  name: string | null
  email: string | null
  username: string | null
  planKey: string
}

interface RepositoryListEntry {
  id: string
  slug: string
  name: string
  language: string
  default_branch: string
  provider: string
}

interface SecretRow {
  id: string
  name: string
  scope: string
  value_preview: string
  last_used_at: string | null
  created_at: string
}

interface WebhookRow {
  id: string
  name: string
  url: string
  events: string[] | string
  active: boolean
  last_delivery_at: string | null
  last_delivery_status: string | null
}

function parseEvents(raw: WebhookRow['events']): string[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch (_error) {
    // JSON.parse failed; fall back to empty array.
    return []
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [section, setSection] = useState<Section>('account')

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
      <aside className={'col-span-12 md:col-span-3'}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={'space-y-1'}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                data-mol-id={`settings-tab-${s}`}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? 'bg-primary-container text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `settings.section.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={'col-span-12 md:col-span-9'}>
        {section === 'account' && <AccountSection />}
        {section === 'repositories' && <RepositoriesSection />}
        {section === 'webhooks' && <WebhooksSection />}
        {section === 'secrets' && <SecretsSection />}
        {section === 'team' && <TeamSection />}
        {section === 'language' && <LanguageSection />}
      </main>
      <section
        className={cm.cn(cm.sp('p', 8), 'col-span-12 bg-surface-container-low rounded-xl')}
        data-mol-id="settings-appearance-section"
      >
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'settings.appearance.description',
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

function AccountSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/me')
      .then((res) => {
        if (!cancelled) setProfile(unwrapSingle<Profile>(res))
      })
      .catch(
        () =>
          !cancelled &&
          setError(
            t('settings.account.loadError', {}, { defaultValue: 'Failed to load profile.' }),
          ),
      )
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      const formData = new FormData(event.currentTarget)
      const payload: Record<string, string> = {}
      const name = formData.get('name')
      const email = formData.get('email')
      const username = formData.get('username')
      if (typeof name === 'string') payload.name = name
      if (typeof email === 'string') payload.email = email
      if (typeof username === 'string' && username.length > 0) payload.username = username
      const updated = await http.put('/api/me', payload)
      setProfile(unwrapSingle<Profile>(updated))
      setSavedAt(Date.now())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.account.saveError', {}, { defaultValue: 'Failed to save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 8), 'text-on-surface-variant')}>
        {t('settings.account.loading', {}, { defaultValue: 'Loading account…' })}
      </p>
    )
  }

  return (
    <section
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface rounded-md border border-outline-variant space-y-4',
      )}
      data-mol-id="settings-account-section"
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.account', {}, { defaultValue: 'Account' })}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          name="name"
          label={t('form.name', {}, { defaultValue: 'Name' })}
          defaultValue={profile?.name ?? ''}
        />
        <Field
          name="email"
          type="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          defaultValue={profile?.email ?? ''}
        />
        <Field
          name="username"
          label={t('auth.username', {}, { defaultValue: 'Username' })}
          defaultValue={profile?.username ?? ''}
        />
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'settings.account.plan',
            { plan: profile?.planKey ?? 'free' },
            { defaultValue: 'Plan: {{plan}}' },
          )}
        </p>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
        {savedAt ? (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-success')}
            data-mol-id="settings-account-saved"
          >
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          data-mol-id="settings-account-save"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md font-mono disabled:opacity-50',
          )}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
        </button>
      </form>
    </section>
  )
}

function RepositoriesSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [repos, setRepos] = useState<RepositoryListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/repositories')
      .then((res) => {
        if (!cancelled) setRepos(unwrapList<RepositoryListEntry>(res))
      })
      .catch(
        () =>
          !cancelled &&
          setError(
            t(
              'settings.repositories.loadError',
              {},
              { defaultValue: 'Failed to load repositories.' },
            ),
          ),
      )
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <section
      className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-md border border-outline-variant')}
      data-mol-id="settings-repositories-section"
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
        {t('settings.repositories.heading', {}, { defaultValue: 'Repository connections' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
        {t(
          'settings.repositories.body',
          { app: APP_NAME },
          {
            defaultValue:
              'Repositories {{app}} watches. Disconnect from your VCS provider to stop ingesting events.',
          },
        )}
      </p>
      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : repos.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.repositories.empty', {}, { defaultValue: 'No repositories connected yet.' })}
        </p>
      ) : (
        <ul className="space-y-2">
          {repos.map((r) => (
            <li
              key={r.id}
              data-mol-id={`settings-repo-${r.slug}`}
              className={cm.cn(
                cm.sp('p', 3),
                cm.flex({ align: 'center', justify: 'between' }),
                'rounded-md border border-outline-variant',
              )}
            >
              <div>
                <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>{r.name}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono')}>
                  {r.provider} · {r.language || '—'} · {r.default_branch}
                </p>
              </div>
              <span
                className={cm.cn(cm.textSize('xs'), 'font-mono uppercase text-on-surface-variant')}
              >
                {r.slug}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WebhooksSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/webhooks')
      setWebhooks(unwrapList<WebhookRow>(res))
    } catch (_error) {
      // load failed — surfaced to the user via setError below; raw error not needed here
      setError(t('settings.webhooks.loadError', {}, { defaultValue: 'Failed to load webhooks.' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/webhooks')
      .then((res) => !cancelled && setWebhooks(unwrapList<WebhookRow>(res)))
      .catch(
        () =>
          !cancelled &&
          setError(
            t('settings.webhooks.loadError', {}, { defaultValue: 'Failed to load webhooks.' }),
          ),
      )
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdding(true)
    setError(null)
    const form = event.currentTarget
    try {
      const fd = new FormData(form)
      const url = String(fd.get('url') ?? '')
      const name = String(fd.get('name') ?? '')
      const events = String(fd.get('events') ?? '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      await http.post('/api/webhooks', { url, name, events, active: true })
      form.reset()
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.webhooks.addError', {}, { defaultValue: 'Failed to add webhook.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(w: WebhookRow) {
    try {
      await http.put(`/api/webhooks/${w.id}`, { active: !w.active })
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.webhooks.updateError', {}, { defaultValue: 'Failed to update webhook.' }),
      )
    }
  }

  async function handleDelete(w: WebhookRow) {
    try {
      await http.delete(`/api/webhooks/${w.id}`)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.webhooks.deleteError', {}, { defaultValue: 'Failed to delete webhook.' }),
      )
    }
  }

  return (
    <section
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface rounded-md border border-outline-variant space-y-4',
      )}
      data-mol-id="settings-webhooks-section"
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.webhooks.heading', {}, { defaultValue: 'Outgoing webhooks' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'settings.webhooks.body',
          {},
          {
            defaultValue:
              'Send pipeline + deploy events to your tools (Slack, PagerDuty, custom URLs).',
          },
        )}
      </p>
      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <ul className="space-y-2">
          {webhooks.map((w) => {
            const events = parseEvents(w.events)
            return (
              <li
                key={w.id}
                data-mol-id={`settings-webhook-${w.id}`}
                className={cm.cn(cm.sp('p', 3), 'rounded-md border border-outline-variant')}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <div className="min-w-0">
                    <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono truncate')}>
                      {w.name || w.url}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant font-mono truncate',
                      )}
                    >
                      {w.url}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono')}>
                      {events.join(', ') || '—'} ·{' '}
                      {w.active
                        ? t('settings.webhooks.active', {}, { defaultValue: 'active' })
                        : t('settings.webhooks.paused', {}, { defaultValue: 'paused' })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(w)}
                      data-mol-id={`webhook-toggle-${w.id}`}
                      className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
                    >
                      {w.active
                        ? t('common.pause', {}, { defaultValue: 'Pause' })
                        : t('common.resume', {}, { defaultValue: 'Resume' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(w)}
                      data-mol-id={`webhook-delete-${w.id}`}
                      className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                    >
                      {t('common.delete', {}, { defaultValue: 'Delete' })}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={handleAdd} className="space-y-2 border-t border-outline-variant pt-4">
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t('settings.webhooks.addHeading', {}, { defaultValue: 'Add webhook' })}
        </h3>
        <input
          type="text"
          name="name"
          placeholder={t(
            'settings.webhooks.namePlaceholder',
            {},
            { defaultValue: 'Slack #releases' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full bg-background border border-outline-variant rounded-md font-mono text-sm',
          )}
          data-mol-id="webhook-name"
        />
        <input
          type="url"
          name="url"
          required
          placeholder="https://hooks.example.com/…"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full bg-background border border-outline-variant rounded-md font-mono text-sm',
          )}
          data-mol-id="webhook-url"
        />
        <input
          type="text"
          name="events"
          placeholder="pipeline.failed,deploy.complete"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full bg-background border border-outline-variant rounded-md font-mono text-sm',
          )}
          data-mol-id="webhook-events"
        />
        <button
          type="submit"
          disabled={adding}
          data-mol-id="webhook-submit"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md font-mono disabled:opacity-50',
          )}
        >
          {adding
            ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
            : t('settings.webhooks.add', {}, { defaultValue: 'Add webhook' })}
        </button>
      </form>
    </section>
  )
}

function SecretsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [secrets, setSecrets] = useState<SecretRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/secrets')
      setSecrets(unwrapList<SecretRow>(res))
    } catch (_error) {
      // load failed — surfaced to the user via setError below; raw error not needed here
      setError(t('settings.secrets.loadError', {}, { defaultValue: 'Failed to load secrets.' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  async function handleRotate(s: SecretRow) {
    try {
      await http.post(`/api/secrets/${s.id}/rotate`, {})
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.secrets.rotateError', {}, { defaultValue: 'Failed to rotate secret.' }),
      )
    }
  }

  async function handleDelete(s: SecretRow) {
    try {
      await http.delete(`/api/secrets/${s.id}`)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.secrets.deleteError', {}, { defaultValue: 'Failed to delete secret.' }),
      )
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdding(true)
    setError(null)
    const form = event.currentTarget
    try {
      const fd = new FormData(form)
      const name = String(fd.get('name') ?? '')
      const value = String(fd.get('value') ?? '')
      const scope = String(fd.get('scope') ?? 'env') as 'env' | 'org' | 'repo'
      await http.post('/api/secrets', { name, value, scope })
      form.reset()
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.secrets.addError', {}, { defaultValue: 'Failed to add secret.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="space-y-3" data-mol-id="settings-secrets-section">
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.secrets.heading', {}, { defaultValue: 'Secrets' })}
      </h2>
      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : secrets.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.secrets.empty', {}, { defaultValue: 'No secrets stored.' })}
        </p>
      ) : (
        secrets.map((s) => (
          <div
            key={s.id}
            data-mol-id={`settings-secret-${s.id}`}
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              'bg-surface rounded-md border border-outline-variant',
            )}
          >
            <div className="min-w-0">
              <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono truncate')}>{s.name}</p>
              <p className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                {s.scope} scope · {s.value_preview} ·{' '}
                {s.last_used_at
                  ? t(
                      'settings.secrets.lastUsed',
                      { date: new Date(s.last_used_at).toLocaleString() },
                      { defaultValue: 'last used {{date}}' },
                    )
                  : t('settings.secrets.neverUsed', {}, { defaultValue: 'never used' })}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleRotate(s)}
                data-mol-id={`secret-rotate-${s.id}`}
                className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
              >
                {t('settings.secrets.rotateCta', {}, { defaultValue: 'Rotate' })}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(s)}
                data-mol-id={`secret-delete-${s.id}`}
                className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
              >
                {t('common.delete', {}, { defaultValue: 'Delete' })}
              </button>
            </div>
          </div>
        ))
      )}
      <form
        onSubmit={handleAdd}
        className={cm.cn(
          cm.sp('p', 4),
          'bg-surface rounded-md border border-outline-variant space-y-2',
        )}
      >
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t('settings.secrets.addHeading', {}, { defaultValue: 'Add secret' })}
        </h3>
        <input
          type="text"
          name="name"
          required
          placeholder="MY_API_TOKEN"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full bg-background border border-outline-variant rounded-md font-mono text-sm',
          )}
          data-mol-id="secret-name"
        />
        <input
          type="text"
          name="value"
          required
          placeholder={t(
            'settings.secrets.valuePlaceholder',
            {},
            { defaultValue: 'Secret value (masked once stored)' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full bg-background border border-outline-variant rounded-md font-mono text-sm',
          )}
          data-mol-id="secret-value"
        />
        <select
          name="scope"
          defaultValue="env"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full bg-background border border-outline-variant rounded-md font-mono text-sm',
          )}
          data-mol-id="secret-scope"
        >
          <option value="env">env</option>
          <option value="org">org</option>
          <option value="repo">repo</option>
        </select>
        <button
          type="submit"
          disabled={adding}
          data-mol-id="secret-submit"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md font-mono disabled:opacity-50',
          )}
        >
          {adding
            ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
            : t('settings.secrets.addCta', {}, { defaultValue: 'Add secret' })}
        </button>
      </form>
    </section>
  )
}

function TeamSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/me')
      .then((res) => !cancelled && setMe(unwrapSingle<Profile>(res)))
      .catch(() => {
        // ignore — surfacing a profile fetch error twice is noise.
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <section className="space-y-3" data-mol-id="settings-team-section">
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.team.heading', {}, { defaultValue: 'Team members' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'settings.team.body',
          {},
          {
            defaultValue:
              'Multi-seat teams are part of the Team plan. Invite teammates by email — they will be added with the Member role and can be promoted to Maintainer or Admin.',
          },
        )}
      </p>
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : me ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'bg-surface rounded-md border border-outline-variant',
          )}
          data-mol-id="settings-team-self"
        >
          <div>
            <p className={cm.fontWeight('semibold')}>{me.name ?? me.email ?? me.username ?? '—'}</p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{me.email ?? ''}</p>
          </div>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'font-mono uppercase rounded-full bg-surface-container text-on-surface-variant',
            )}
          >
            {t('settings.team.youLabel', {}, { defaultValue: 'owner' })}
          </span>
        </div>
      ) : null}
    </section>
  )
}

function LanguageSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface rounded-md border border-outline-variant space-y-3',
      )}
      data-mol-id="settings-language-section"
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('footer.language', {}, { defaultValue: 'Language' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      </p>
      <LanguagePicker />
    </section>
  )
}

function Field({
  name,
  label,
  defaultValue,
  type = 'text',
}: {
  name: string
  label: string
  defaultValue: string
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full bg-background border border-outline-variant rounded-md font-mono',
        )}
        data-mol-id={`account-${name}`}
      />
    </label>
  )
}
