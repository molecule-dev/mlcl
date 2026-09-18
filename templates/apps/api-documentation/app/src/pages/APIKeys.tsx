import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ApiKey {
  id: string
  name: string
  key_masked: string
  scopes: string[]
  last_used_at?: string | null
  created_at: string
  // Plaintext returned ONCE on creation; never persisted, never re-readable.
  key?: string
}

function fmtDate(iso?: string | null, neverLabel = 'never'): string {
  if (!iso) return neverLabel
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function APIKeys() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<{ name: string; secret: string } | null>(null)
  const [revealCopied, setRevealCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/api_keys')
      .then((res) => {
        if (!cancelled) setKeys(unwrapList<ApiKey>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('apiKeys.loadError', {}, { defaultValue: 'Failed to load API keys.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newKeyName.trim() || creating) return
    setCreating(true)
    http
      .post<ApiKey>('/api/api_keys', { name: newKeyName.trim(), scopes: ['read'] })
      .then((res) => {
        const created = (
          res?.data && typeof res.data === 'object'
            ? ((res.data as { data?: ApiKey }).data ?? (res.data as ApiKey))
            : null
        ) as ApiKey | null
        if (created) {
          setKeys((prev) => [...prev, { ...created, key: undefined }])
          // Surface the plaintext key ONCE — the server never returns it again.
          if (created.key) {
            setRevealedKey({ name: created.name, secret: created.key })
            setRevealCopied(false)
          }
        } else {
          http
            .get('/api/api_keys')
            .then((r) => setKeys(unwrapList<ApiKey>(r)))
            .catch(() => {
              /* ignore */
            })
        }
        setNewKeyName('')
        setShowCreateForm(false)
      })
      .catch(() => {
        setError(t('apiKeys.createError', {}, { defaultValue: 'Could not create API key.' }))
      })
      .finally(() => setCreating(false))
  }

  function handleCopyRevealed() {
    if (!revealedKey) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(revealedKey.secret).then(() => {
        setRevealCopied(true)
      })
    }
  }

  function handleRevoke(id: string) {
    setKeys((prev) => prev.filter((k) => k.id !== id))
    http.delete(`/api/api_keys/${id}`).catch(() => {
      /* optimistic */
    })
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary font-mono',
            )}
          >
            {t('apiKeys.eyebrow', {}, { defaultValue: 'AUTH' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('apiKeys.heading', {}, { defaultValue: 'API keys' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'apiKeys.subheading',
              {},
              { defaultValue: 'Personal and project keys, scoped per environment.' },
            )}
          </p>
          {!loading && !error && keys.length > 0 ? (
            <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-primary-container text-primary uppercase tracking-wider font-mono',
                )}
              >
                {t(
                  'apiKeys.totalCount',
                  { count: keys.length },
                  { defaultValue: '{{count}} active keys' },
                )}
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          aria-expanded={showCreateForm}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {showCreateForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('apiKeys.createCta', {}, { defaultValue: 'Create key' })}
        </button>
      </header>

      {revealedKey ? (
        <section
          data-revealed-key={revealedKey.secret}
          className={cm.cn(cm.card(), cm.sp('p', 5), 'border-2 border-emerald-500')}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-emerald-400 font-mono uppercase tracking-widest font-bold',
                )}
              >
                {t('apiKeys.revealEyebrow', {}, { defaultValue: 'COPY_NOW · ONE_TIME_VIEW' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 1))}>
                {t(
                  'apiKeys.revealHeading',
                  { name: revealedKey.name },
                  { defaultValue: 'Your new key for "{{name}}"' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'apiKeys.revealHelp',
                  {},
                  {
                    defaultValue:
                      'This is the only time the full key is shown. Copy it now and store it securely — we keep only a hash.',
                  },
                )}
              </p>
            </div>
          </header>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            <code
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-secondary text-on-secondary rounded-md font-mono text-sm flex-1 break-all',
              )}
              data-testid="revealed-key-value"
            >
              {revealedKey.secret}
            </code>
            <button
              type="button"
              onClick={handleCopyRevealed}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md',
              )}
            >
              {revealCopied
                ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
                : t('apiKeys.copyCta', {}, { defaultValue: 'Copy key' })}
            </button>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'text-on-surface-variant hover:underline',
              )}
            >
              {t('apiKeys.dismissCta', {}, { defaultValue: 'Dismiss' })}
            </button>
          </div>
        </section>
      ) : null}

      {showCreateForm ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <form
            onSubmit={handleCreate}
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={t(
                'apiKeys.labelHint',
                {},
                { defaultValue: 'Key label (e.g. CI pipeline)' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'flex-1 min-w-[260px] border border-outline-variant rounded-md font-mono text-sm',
              )}
            />
            <button
              type="submit"
              disabled={!newKeyName.trim() || creating}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('common.create', {}, { defaultValue: 'Create' })}
            </button>
          </form>
        </section>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : keys.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'apiKeys.empty',
            {},
            { defaultValue: 'No API keys yet — create your first key to get started.' },
          )}
        </p>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          <table className={cm.cn('w-full')}>
            <thead
              className={cm.cn(
                'bg-surface-container',
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              <tr>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('apiKeys.col.key', {}, { defaultValue: 'Key' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('apiKeys.col.scopes', {}, { defaultValue: 'Scopes' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('apiKeys.col.lastUsed', {}, { defaultValue: 'Last used' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('apiKeys.col.created', {}, { defaultValue: 'Created' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {keys.map((k) => (
                <tr key={k.id} className={cm.cn('hover:bg-surface-container')}>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}>
                    {k.name}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <code
                      className={cm.cn(cm.textSize('xs'), 'font-mono', 'text-on-surface-variant')}
                    >
                      {k.key_masked}
                    </code>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
                      {(k.scopes ?? []).map((s) => (
                        <span
                          key={s}
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            cm.roundedFull,
                            'bg-surface-container font-mono',
                            'text-on-surface-variant',
                          )}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      'whitespace-nowrap',
                    )}
                  >
                    {fmtDate(k.last_used_at, t('apiKeys.never', {}, { defaultValue: 'never' }))}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      'whitespace-nowrap',
                    )}
                  >
                    {fmtDate(k.created_at)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    <button
                      type="button"
                      onClick={() => handleRevoke(k.id)}
                      className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                    >
                      {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
