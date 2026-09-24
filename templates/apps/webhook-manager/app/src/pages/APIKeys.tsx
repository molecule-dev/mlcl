import { useState } from 'react'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { StatusPill } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'
import { SettingsTabs } from './Settings.js'

const PANEL_BG = 'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)'
const PANEL_BORDER = 'var(--mol-color-border)'
const FIELD_BORDER = 'var(--mol-color-border)'
const INPUT_BG = 'var(--mol-color-input-background)'

interface ApiKey {
  id: string
  user_id: string
  name: string
  key_masked: string
  scopes: unknown
  is_revoked: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

const SCOPE_TINT: Record<string, { fg: string; bg: string }> = {
  '*': {
    fg: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 18%, transparent)',
  },
  'endpoints:write': {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
  },
  'endpoints:read': {
    fg: 'var(--mol-color-info)',
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
  },
  'deliveries:read': {
    fg: 'var(--mol-color-info)',
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
  },
  'deliveries:replay': {
    fg: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
  },
  'audit:read': {
    fg: 'var(--mol-color-info)',
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
  },
  'events:write': {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
  },
}

const SCOPE_OPTIONS = [
  'endpoints:read',
  'endpoints:write',
  'deliveries:read',
  'deliveries:replay',
  'audit:read',
  'events:write',
  '*',
] as const

const parseScopes = (v: unknown): string[] => {
  if (Array.isArray(v)) return v as string[]
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return Array.isArray(p) ? p : []
    } catch (_error) {
      // invalid JSON — fall back to empty scopes array
      return []
    }
  }
  return []
}

const fmtDate = (s: string | null): string => {
  if (!s) return 'never'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toISOString().slice(0, 10)
}

const fmtRelative = (s: string | null): string => {
  if (!s) return 'never'
  const ms = Date.now() - new Date(s).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const mins = Math.floor(sec / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function APIKeys() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { data: keys, refetch } = useApi<ApiKey[]>('/api_keys')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [env, setEnv] = useState<'live' | 'test'>('live')
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
    new Set(['endpoints:read', 'deliveries:read']),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const list = keys ?? []
  const activeCount = list.filter((k) => !k.is_revoked).length
  const revokedCount = list.filter((k) => k.is_revoked).length

  const toggleScope = (s: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const handleCreate = async () => {
    if (submitting) return
    if (!name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    if (selectedScopes.size === 0) {
      setError(t('apiKeys.error.scopeRequired', {}, { defaultValue: 'Pick at least one scope.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const client = getHttpClient()
      const res = await client.post<{ key: string; name?: string }>('/api_keys', {
        name: name.trim(),
        env,
        scopes: Array.from(selectedScopes),
      })
      const data = res.data
      track({ name: 'api_key.created', properties: { env, scopes: Array.from(selectedScopes) } })
      setRevealed({ name: data?.name || name.trim(), key: data?.key || '' })
      setName('')
      setSelectedScopes(new Set(['endpoints:read', 'deliveries:read']))
      setShowForm(false)
      refetch()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('apiKeys.error.createFailed', {}, { defaultValue: 'Failed to create key.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const revokeKey = async (id: string) => {
    try {
      const client = getHttpClient()
      await client.post(`/api_keys/${id}/revoke`, {})
      track({ name: 'api_key.revoked', properties: { api_key_id: id } })
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed')
    }
  }

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch (_error) {
      // Browser denied clipboard — fall back to a temporary textarea.
      const ta = document.createElement('textarea')
      ta.value = key
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
      } catch (execError) {
        setError('Failed to copy.')
        logError('copyKey.execCommand', execError)
      }
      document.body.removeChild(ta)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-5xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="api-keys-root"
    >
      <div className={cm.cn('mb-6')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('apiKeys.eyebrow', {}, { defaultValue: 'workspace · access tokens' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('apiKeys.heading', {}, { defaultValue: 'API keys' })}
        </h1>
        <p
          className={cm.cn('mt-2 text-sm max-w-2xl')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'apiKeys.body',
            {},
            {
              defaultValue:
                'Programmatic access tokens. Treat them like passwords — store in env vars, never commit.',
            },
          )}
        </p>
      </div>

      <SettingsTabs active="api-keys" />

      {revealed && (
        <div
          className={cm.cn('rounded-xl p-5 mb-5')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-success) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--mol-color-success) 40%, transparent)',
          }}
          data-mol-id="api-keys-revealed-banner"
          role="status"
        >
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-2')}
            style={{ color: 'var(--mol-color-success)' }}
          >
            {t('apiKeys.justCreated', {}, { defaultValue: '✓ key created · copy it now' })}
          </p>
          <p className={cm.cn('text-sm font-bold mb-2')} style={{ color: 'var(--mol-color-text)' }}>
            {revealed.name}
          </p>
          <div
            className={cm.cn('flex items-center gap-2 rounded-md px-3 py-2 font-mono text-sm')}
            style={{
              backgroundColor: 'var(--mol-color-background)',
              border: '1px solid var(--mol-color-border)',
              color: 'var(--mol-color-text)',
            }}
          >
            <span
              className={cm.cn('flex-1 truncate select-all')}
              data-mol-id="api-keys-revealed-secret"
            >
              {revealed.key}
            </span>
            <button
              type="button"
              onClick={() => copyKey(revealed.key)}
              className={cm.cn('opacity-80 hover:opacity-100 px-2 py-1 rounded')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
              data-mol-id="api-keys-revealed-copy"
            >
              {copied === revealed.key
                ? t('apiKeys.copied', {}, { defaultValue: 'copied!' })
                : t('apiKeys.copy', {}, { defaultValue: 'copy' })}
            </button>
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className={cm.cn('opacity-80 hover:opacity-100 px-2 py-1 rounded')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t('apiKeys.dismiss', {}, { defaultValue: 'dismiss' })}
            </button>
          </div>
          <p className={cm.cn('mt-2 text-xs')} style={{ color: 'var(--mol-color-text-secondary)' }}>
            {t(
              'apiKeys.revealedHint',
              {},
              {
                defaultValue: 'This is the only time the full key will be displayed. Store it now.',
              },
            )}
          </p>
        </div>
      )}

      <div className={cm.cn('flex items-center justify-between mb-4 flex-wrap gap-2')}>
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'apiKeys.activeCount',
            { active: activeCount, revoked: revokedCount },
            { defaultValue: '{{active}} active · {{revoked}} revoked' },
          )}
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-all hover:opacity-90 shadow-lg',
          )}
          style={{
            backgroundColor: BRAND_COLOR,
            color: 'var(--color-on-primary)',
            boxShadow:
              '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
          }}
          data-mol-id="api-keys-toggle-form"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            {showForm ? 'close' : 'add'}
          </span>
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('apiKeys.generate', {}, { defaultValue: 'Generate new key' })}
        </button>
      </div>

      {showForm && (
        <section
          className={cm.cn('rounded-xl p-5 mb-5')}
          style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
          data-mol-id="api-keys-form"
        >
          <label
            className={cm.cn(
              'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="key-name"
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
          </label>
          <input
            id="key-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('apiKeys.namePlaceholder', {}, { defaultValue: 'e.g. terraform-prod' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              'rounded-md font-mono text-sm',
            )}
            style={{
              backgroundColor: INPUT_BG,
              border: `1px solid ${FIELD_BORDER}`,
              color: 'var(--mol-color-text)',
            }}
            data-mol-id="api-keys-name-input"
          />

          <p
            className={cm.cn(
              'block font-mono text-[10px] font-black uppercase tracking-widest mt-5 mb-2',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('apiKeys.fieldEnv', {}, { defaultValue: 'Environment' })}
          </p>
          <div className={cm.cn('flex items-center gap-2')}>
            {(['live', 'test'] as const).map((e) => {
              const active = env === e
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEnv(e)}
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest',
                  )}
                  style={{
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)'
                      : 'transparent',
                    color: active ? 'var(--mol-color-success)' : 'var(--mol-color-text-secondary)',
                    boxShadow: active
                      ? 'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-success) 35%, transparent)'
                      : `inset 0 0 0 1px ${FIELD_BORDER}`,
                  }}
                  data-mol-id={`api-keys-env-${e}`}
                >
                  {e}
                </button>
              )
            })}
          </div>

          <p
            className={cm.cn(
              'block font-mono text-[10px] font-black uppercase tracking-widest mt-5 mb-2',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('apiKeys.fieldScopes', {}, { defaultValue: 'Scopes' })}
          </p>
          <div className={cm.cn('grid gap-2 grid-cols-2 sm:grid-cols-3')}>
            {SCOPE_OPTIONS.map((s) => {
              const active = selectedScopes.has(s)
              const tint = SCOPE_TINT[s]
              return (
                <label
                  key={s}
                  className={cm.cn('flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer')}
                  style={{
                    backgroundColor: active
                      ? tint.bg
                      : 'color-mix(in srgb, var(--mol-color-surface) 60%, transparent)',
                    border: `1px solid ${active ? tint.fg : FIELD_BORDER}`,
                  }}
                  data-mol-id={`api-keys-scope-${s.replace(/[^a-z]/g, '-')}`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleScope(s)}
                    className={cm.cn('w-4 h-4 rounded')}
                    style={{ accentColor: BRAND_COLOR }}
                  />
                  <span
                    className={cm.cn('font-mono text-xs font-semibold')}
                    style={{ color: active ? tint.fg : 'var(--mol-color-text-secondary)' }}
                  >
                    {s}
                  </span>
                </label>
              )
            })}
          </div>

          {error && (
            <p
              className={cm.cn('mt-4 font-mono text-xs')}
              style={{ color: 'var(--mol-color-error)' }}
              role="alert"
            >
              {error}
            </p>
          )}

          <div className={cm.cn('mt-5 flex justify-end gap-2')}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={cm.cn('px-4 py-2 rounded-md font-mono text-sm font-semibold')}
              style={{
                border: '1px solid var(--mol-color-border)',
                color: 'var(--mol-color-text)',
              }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className={cm.cn(
                'px-5 py-2 rounded-md font-mono text-sm font-semibold disabled:opacity-60',
              )}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
              data-mol-id="api-keys-create-submit"
            >
              {submitting
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('apiKeys.create', {}, { defaultValue: 'Create key' })}
            </button>
          </div>
        </section>
      )}

      <div
        className={cm.cn('rounded-xl overflow-hidden mb-6')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        data-mol-id="api-keys-list"
      >
        <div
          className={cm.cn(
            'grid grid-cols-12 gap-3 px-5 py-3 font-mono text-[10px] font-black uppercase tracking-widest',
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-background) 60%, transparent)',
            color: 'var(--mol-color-text-tertiary)',
            borderBottom: '1px solid var(--mol-color-border)',
          }}
        >
          <span className={cm.cn('col-span-3')}>
            {t('form.name', {}, { defaultValue: 'Name' })}
          </span>
          <span className={cm.cn('col-span-3')}>
            {t('apiKeys.col.key', {}, { defaultValue: 'Key' })}
          </span>
          <span className={cm.cn('col-span-2 hidden md:block')}>
            {t('apiKeys.col.created', {}, { defaultValue: 'Created' })}
          </span>
          <span className={cm.cn('col-span-2 hidden md:block')}>
            {t('apiKeys.col.lastUsed', {}, { defaultValue: 'Last used' })}
          </span>
          <span className={cm.cn('col-span-2')}>
            {t('nav.actions', {}, { defaultValue: 'Actions' })}
          </span>
        </div>
        {list.length === 0 ? (
          <div className={cm.cn('px-8 py-12 text-center')} data-mol-id="api-keys-empty">
            <p
              className={cm.cn('font-mono text-sm font-bold mb-1')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {t('apiKeys.empty', {}, { defaultValue: 'No keys yet.' })}
            </p>
            <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
              {t(
                'apiKeys.emptyHint',
                {},
                {
                  defaultValue: 'Click "Generate new key" to issue your first programmatic token.',
                },
              )}
            </p>
          </div>
        ) : (
          <ul>
            {list.map((key) => {
              const scopes = parseScopes(key.scopes)
              return (
                <li
                  key={key.id}
                  className={cm.cn('grid grid-cols-12 gap-3 px-5 py-3 items-center')}
                  style={{
                    borderBottom:
                      '1px solid color-mix(in srgb, var(--mol-color-border) 50%, transparent)',
                    opacity: key.is_revoked ? 0.5 : 1,
                  }}
                  data-mol-id={`api-keys-row-${key.id}`}
                >
                  <div className={cm.cn('col-span-3')}>
                    <span
                      className={cm.cn('text-sm font-bold')}
                      style={{
                        color: key.is_revoked
                          ? 'var(--mol-color-text-secondary)'
                          : 'var(--mol-color-text)',
                        textDecoration: key.is_revoked ? 'line-through' : 'none',
                      }}
                    >
                      {key.name}
                    </span>
                    <div className={cm.cn('mt-1 flex flex-wrap gap-1')}>
                      {scopes.map((s) => {
                        const tint = SCOPE_TINT[s] ?? {
                          fg: 'var(--mol-color-text-secondary)',
                          bg: 'color-mix(in srgb, var(--mol-color-border) 50%, transparent)',
                        }
                        return (
                          <span
                            key={s}
                            className={cm.cn(
                              'inline-flex px-1.5 py-0.5 rounded font-mono text-[9px] font-extrabold tracking-widest',
                            )}
                            style={{ backgroundColor: tint.bg, color: tint.fg }}
                          >
                            {s}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <span
                    className={cm.cn('col-span-3 font-mono text-xs truncate')}
                    style={{
                      color: key.is_revoked
                        ? 'var(--mol-color-text-tertiary)'
                        : 'var(--mol-color-text-secondary)',
                    }}
                  >
                    {key.key_masked}
                  </span>
                  <span
                    className={cm.cn('col-span-2 font-mono text-xs hidden md:block')}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                  >
                    {fmtDate(key.created_at)}
                  </span>
                  <span
                    className={cm.cn('col-span-2 font-mono text-xs hidden md:block')}
                    style={{
                      color: key.is_revoked
                        ? 'var(--mol-color-text-tertiary)'
                        : 'var(--mol-color-text-secondary)',
                    }}
                  >
                    {fmtRelative(key.last_used_at)}
                  </span>
                  <div className={cm.cn('col-span-2 flex items-center gap-2')}>
                    {key.is_revoked ? (
                      <StatusPill status="disabled" label="REVOKED" />
                    ) : (
                      <ConfirmButton
                        label={t('common.revoke', {}, { defaultValue: 'Revoke' })}
                        confirmLabel={t(
                          'apiKeys.confirmRevoke',
                          {},
                          {
                            defaultValue: 'Revoke this key? Existing requests using it will fail.',
                          },
                        )}
                        onConfirm={() => revokeKey(key.id)}
                        disarmSeconds={5}
                        color="error"
                        size="sm"
                        data-mol-id={`api-keys-revoke-${key.id}`}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <section
        className={cm.cn('rounded-xl p-6')}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--mol-color-secondary) 6%, transparent)',
          border: '1px solid color-mix(in srgb, var(--mol-color-secondary) 30%, transparent)',
        }}
      >
        <h2
          className={cm.cn('text-base font-extrabold tracking-tight mb-3')}
          style={{ color: 'var(--mol-color-secondary)' }}
        >
          {t('apiKeys.bestPractices', {}, { defaultValue: 'Best practices' })}
        </h2>
        <ul
          className={cm.cn('flex flex-col gap-2 text-sm')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          <li className={cm.cn('flex items-start gap-2')}>
            <span
              className={cm.cn('material-symbols-outlined text-base mt-0.5')}
              style={{ color: 'var(--mol-color-secondary)' }}
              aria-hidden="true"
            >
              check_circle
            </span>
            {t(
              'apiKeys.bp1',
              {},
              {
                defaultValue:
                  'Store keys in environment variables — never in committed code or shared docs.',
              },
            )}
          </li>
          <li className={cm.cn('flex items-start gap-2')}>
            <span
              className={cm.cn('material-symbols-outlined text-base mt-0.5')}
              style={{ color: 'var(--mol-color-secondary)' }}
              aria-hidden="true"
            >
              check_circle
            </span>
            {t(
              'apiKeys.bp2',
              { app: APP_NAME },
              { defaultValue: 'Rotate keys at least every 90 days; {{app}} will remind you.' },
            )}
          </li>
          <li className={cm.cn('flex items-start gap-2')}>
            <span
              className={cm.cn('material-symbols-outlined text-base mt-0.5')}
              style={{ color: 'var(--mol-color-secondary)' }}
              aria-hidden="true"
            >
              check_circle
            </span>
            {t(
              'apiKeys.bp3',
              {},
              {
                defaultValue:
                  'Scope keys minimally — separate keys for read-only dashboards vs CI replay.',
              },
            )}
          </li>
        </ul>
      </section>
    </div>
  )
}
