import { type FormEvent, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface TokenApi {
  id: string
  name: string
  scopes?: { vault_ids?: string[]; permissions?: string[] }
  expires_at?: string | null
  last_used_at?: string | null
  revoked_at?: string | null
  created_at?: string | null
  token?: string
}

const PERMISSIONS = ['read', 'write', 'rotate'] as const

const tone = (token: TokenApi): SecretStatusTone => {
  if (token.revoked_at) return 'revoked'
  if (token.expires_at && new Date(token.expires_at).getTime() < Date.now()) return 'expired'
  return 'active'
}

export function ApiTokens() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tokens, setTokens] = useState<TokenApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [perms, setPerms] = useState<Set<(typeof PERMISSIONS)[number]>>(new Set(['read']))
  const [submitting, setSubmitting] = useState(false)
  const [plaintext, setPlaintext] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reload = async () => {
    try {
      const res = await http.get<TokenApi[]>('/api/api-tokens')
      setTokens(Array.isArray(res.data) ? (res.data as TokenApi[]) : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const togglePerm = (p: (typeof PERMISSIONS)[number]) => {
    setPerms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      if (next.size === 0) next.add('read')
      return next
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const res = await http.post<TokenApi>('/api/api-tokens', {
        name: name.trim(),
        scopes: { vault_ids: [], permissions: Array.from(perms) },
      })
      const created = res.data as TokenApi | undefined
      if (created?.token) setPlaintext(created.token)
      // Plaintext token shown once in-UI; never enters telemetry.
      void track({ name: 'token.created', properties: { token_id: created?.id } })
      setName('')
      setPerms(new Set(['read']))
      setCreating(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'create failed')
    } finally {
      setSubmitting(false)
    }
  }

  const revoke = async (id: string) => {
    if (!window.confirm(t('apiTokens.confirmRevoke', {}, { defaultValue: 'Revoke this token?' })))
      return
    try {
      await http.post(`/api/api-tokens/${id}/revoke`, {})
      void track({ name: 'token.revoked', properties: { token_id: id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'revoke failed')
    }
  }

  const remove = async (id: string) => {
    if (
      !window.confirm(
        t(
          'apiTokens.confirmDelete',
          {},
          { defaultValue: 'Delete this token? This action cannot be undone.' },
        ),
      )
    )
      return
    try {
      await http.delete(`/api/api-tokens/${id}`)
      void track({ name: 'token.deleted', properties: { token_id: id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed')
    }
  }

  const copyPlaintext = async () => {
    if (!plaintext) return
    try {
      await navigator.clipboard.writeText(plaintext)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (_error) {
      /* clipboard unavailable */
    }
  }

  return (
    <SecretsManagerLayout
      topAction={
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          data-mol-id="api-tokens-new-toggle"
          className={cm.cn(
            'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-[12px] font-bold text-on-primary transition-colors hover:bg-primary/90',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            add
          </span>
          {t('apiTokens.new', {}, { defaultValue: 'New token' })}
        </button>
      }
    >
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'apiTokens.kicker',
              { count: tokens.length },
              { defaultValue: `${tokens.length} tokens` },
            )}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('apiTokens.heading', {}, { defaultValue: 'API tokens' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'apiTokens.subheading',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Personal and service tokens for the {{appName}} CLI and SDK. Plaintext shown once at creation.',
              },
            )}
          </p>
        </header>

        {plaintext ? (
          <div
            data-mol-id="api-tokens-plaintext"
            className={cm.cn('rounded-xl border border-primary/40 bg-primary/10 p-4')}
          >
            <div className={cm.cn('flex items-center justify-between')}>
              <h3 className={cm.cn('font-headline text-sm font-semibold text-primary')}>
                {t(
                  'apiTokens.plaintext.title',
                  {},
                  { defaultValue: 'New token created — copy now (you will not see it again)' },
                )}
              </h3>
              <button
                type="button"
                onClick={() => setPlaintext(null)}
                aria-label={t('common.close', {}, { defaultValue: 'Close' })}
                className={cm.cn('text-muted hover:text-text')}
              >
                <span aria-hidden="true" className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>
            <code
              className={cm.cn(
                'mt-3 block break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-primary',
              )}
            >
              {plaintext}
            </code>
            <button
              type="button"
              onClick={copyPlaintext}
              data-mol-id="api-tokens-copy-plaintext"
              className={cm.cn(
                'mt-2 inline-flex h-8 items-center gap-1 rounded border border-border bg-surface px-3 font-headline text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary',
              )}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied
                ? t('common.copied', {}, { defaultValue: 'Copied' })
                : t('common.copy', {}, { defaultValue: 'Copy' })}
            </button>
          </div>
        ) : null}

        {creating ? (
          <form
            onSubmit={submit}
            className={cm.cn('flex flex-col gap-3 rounded-xl border border-border bg-surface p-4')}
          >
            <label
              className={cm.cn(
                'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              {t('apiTokens.form.name', {}, { defaultValue: 'Token name' })}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                data-mol-id="api-token-name"
                placeholder="ci-runner / personal-cli"
                className={cm.cn(
                  'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              />
            </label>
            <fieldset
              className={cm.cn(
                'flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted',
              )}
            >
              <legend>{t('apiTokens.form.scopes', {}, { defaultValue: 'Permissions' })}</legend>
              <div className={cm.cn('flex flex-wrap items-center gap-2 pt-1')}>
                {PERMISSIONS.map((p) => (
                  <label
                    key={p}
                    className={cm.cn(
                      'inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 font-mono text-xs text-text',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={perms.has(p)}
                      onChange={() => togglePerm(p)}
                      data-mol-id={`api-token-perm-${p}`}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={submitting}
              data-mol-id="api-token-submit"
              className={cm.cn(
                'inline-flex h-9 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('apiTokens.form.submit', {}, { defaultValue: 'Create token' })}
            </button>
          </form>
        ) : null}

        {loading ? (
          <div
            data-mol-id="api-tokens-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 text-center font-mono text-xs text-muted',
            )}
          >
            {t('apiTokens.loading', {}, { defaultValue: 'Loading tokens…' })}
          </div>
        ) : error ? (
          <div
            data-mol-id="api-tokens-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error}
          </div>
        ) : tokens.length === 0 ? (
          <div
            data-mol-id="api-tokens-empty"
            className={cm.cn(
              'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-muted">
              key
            </span>
            <p className={cm.cn('font-body text-sm text-muted')}>
              {t(
                'apiTokens.empty',
                {},
                {
                  defaultValue:
                    'No API tokens yet — create one to use the CLI or programmatic API.',
                },
              )}
            </p>
          </div>
        ) : (
          <section className={cm.cn('overflow-hidden rounded-xl border border-border bg-surface')}>
            <header
              className={cm.cn(
                'flex h-9 items-center gap-3 border-b border-border bg-surface-secondary px-4 font-mono text-[10px] font-black uppercase tracking-widest text-muted',
              )}
            >
              <span className={cm.cn('flex-1')}>
                {t('form.name', {}, { defaultValue: 'Name' })}
              </span>
              <span className={cm.cn('w-44')}>
                {t('apiTokens.col.permissions', {}, { defaultValue: 'Permissions' })}
              </span>
              <span className={cm.cn('w-24')}>
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </span>
              <span className={cm.cn('hidden w-44 text-right md:inline')}>
                {t('apiTokens.col.lastUsed', {}, { defaultValue: 'Last used' })}
              </span>
              <span className={cm.cn('w-32 text-right')}>
                {t('apiTokens.col.actions', {}, { defaultValue: '' })}
              </span>
            </header>
            <ol data-mol-id="api-tokens-list">
              {tokens.map((tok) => (
                <li
                  key={tok.id}
                  className={cm.cn(
                    'flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0',
                  )}
                >
                  <span className={cm.cn('flex-1 truncate font-mono text-sm text-text')}>
                    {tok.name}
                  </span>
                  <span className={cm.cn('w-44 truncate font-mono text-[11px] text-muted')}>
                    {(tok.scopes?.permissions ?? []).join(', ') || '—'}
                  </span>
                  <span className={cm.cn('w-24')}>
                    <SecretStatusPill
                      tone={tone(tok)}
                      label={tok.revoked_at ? 'revoked' : 'active'}
                      compact
                    />
                  </span>
                  <span
                    className={cm.cn(
                      'hidden w-44 text-right font-mono text-[11px] text-muted md:inline',
                    )}
                  >
                    {tok.last_used_at ? new Date(tok.last_used_at).toLocaleString() : '—'}
                  </span>
                  <span className={cm.cn('flex w-32 items-center justify-end gap-1')}>
                    {!tok.revoked_at ? (
                      <button
                        type="button"
                        onClick={() => revoke(tok.id)}
                        data-mol-id={`api-token-revoke-${tok.id}`}
                        aria-label={t('apiTokens.revoke', {}, { defaultValue: 'Revoke token' })}
                        className={cm.cn(
                          'inline-flex h-7 items-center rounded border border-border bg-surface px-2 font-mono text-[11px] text-muted transition-colors hover:border-error hover:text-error',
                        )}
                      >
                        {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(tok.id)}
                      data-mol-id={`api-token-delete-${tok.id}`}
                      aria-label={t('apiTokens.delete', {}, { defaultValue: 'Delete token' })}
                      className={cm.cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted transition-colors hover:border-error hover:text-error',
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default ApiTokens
