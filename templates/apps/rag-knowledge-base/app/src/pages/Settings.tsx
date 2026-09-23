import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface CurrentUser {
  id: string
  name?: string | null
  email?: string | null
}

/** The `rag` slice served by GET/PATCH /api/settings (server-side channel). */
interface RagPrefs {
  retrievalK?: number
  chunkSize?: number
  chunkOverlap?: number
  embeddingSize?: 'large' | 'small'
}

interface ApiTokenRecord {
  id: string
  label: string
  hashed_token?: never
  last_used_at?: string | null
  created_at: string
}

const DEFAULT_PREFS = {
  retrievalK: 5,
  chunkSize: 350,
  chunkOverlap: 0,
  embeddingSize: 'large' as 'large' | 'small',
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const user = useUser<CurrentUser>()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [retrievalK, setRetrievalK] = useState(DEFAULT_PREFS.retrievalK)
  const [chunkSize, setChunkSize] = useState(DEFAULT_PREFS.chunkSize)
  const [chunkOverlap, setChunkOverlap] = useState(DEFAULT_PREFS.chunkOverlap)
  const [embeddingSize, setEmbeddingSize] = useState<'large' | 'small'>(DEFAULT_PREFS.embeddingSize)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  const [tokens, setTokens] = useState<ApiTokenRecord[]>([])
  const [tokenLabel, setTokenLabel] = useState('')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenFormOpen, setTokenFormOpen] = useState(false)
  // Two-step revoke: the first click arms the row ("Revoke?" → "Confirm"),
  // so a destructive action can't fire from a single slip. Clicking elsewhere
  // or re-clicking the armed row's Reset disarms it.
  const [armedRevokeId, setArmedRevokeId] = useState<string | null>(null)

  // Load latest user state — `useUser()` only reflects the cached login
  // payload, not the post-update record. /api/users/:id is the source of
  // truth for read-after-write checks.
  const [, setLoadedUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    http
      .get(`/api/users/${user.id}`)
      .then((res) => {
        if (cancelled) return
        // The user resource wraps the record in a `props` envelope (see
        // @molecule/api-resource-user); unwrap before reading fields.
        const envelope = unwrapSingle<{ props?: CurrentUser } & CurrentUser>(res)
        const fetched: CurrentUser | null =
          envelope && 'props' in envelope && envelope.props
            ? (envelope.props as CurrentUser)
            : (envelope as CurrentUser | null)
        if (!fetched) return
        setLoadedUser(fetched)
        setName(fetched.name ?? '')
        setEmail(fetched.email ?? '')
      })
      .catch(() => {})
    // Retrieval defaults come from the server-side /api/settings channel:
    // the platform user resource NEVER returns `oauthData` on reads (it is
    // stripped as sensitive), so prefs saved into users.oauthData are only
    // readable through this handler, which reads the column server-side.
    http
      .get('/api/settings')
      .then((res) => {
        if (cancelled) return
        const prefs = unwrapSingle<{ rag?: RagPrefs }>(res)?.rag ?? {}
        setRetrievalK(prefs.retrievalK ?? DEFAULT_PREFS.retrievalK)
        setChunkSize(prefs.chunkSize ?? DEFAULT_PREFS.chunkSize)
        setChunkOverlap(prefs.chunkOverlap ?? DEFAULT_PREFS.chunkOverlap)
        setEmbeddingSize(prefs.embeddingSize ?? DEFAULT_PREFS.embeddingSize)
      })
      .catch(() => {})
    http
      .get('/api/api-tokens')
      .then((res) => {
        if (cancelled) return
        setTokens(unwrapList<ApiTokenRecord>(res))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id, http])

  const SectionCard = useMemo(
    () =>
      function SectionCard({
        title,
        description,
        children,
      }: {
        title: string
        description?: string
        children: React.ReactNode
      }) {
        return (
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.flex({ direction: 'col', gap: 'md' }),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
            )}
          >
            <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>{title}</h2>
              {description ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{description}</p>
              ) : null}
            </div>
            {children}
          </section>
        )
      },
    [cm],
  )

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!user?.id) return
    setProfileSaving(true)
    setProfileSaved(false)
    setProfileError(null)
    try {
      await http.patch(`/api/users/${user.id}`, { name, email })
      setProfileSaved(true)
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : t('settings.profile.saveFailed', {}, { defaultValue: 'Failed to save profile.' }),
      )
    } finally {
      setProfileSaving(false)
    }
  }

  async function savePrefs(event: React.FormEvent) {
    event.preventDefault()
    setPrefsSaving(true)
    setPrefsSaved(false)
    setPrefsError(null)
    try {
      const res = await http.patch('/api/settings', {
        rag: { retrievalK, chunkSize, chunkOverlap, embeddingSize },
      })
      // Read-after-write from the server's response (merged slice) so the
      // form shows exactly what was persisted.
      const prefs = unwrapSingle<{ rag?: RagPrefs }>(res)?.rag
      if (prefs) {
        setRetrievalK(prefs.retrievalK ?? retrievalK)
        setChunkSize(prefs.chunkSize ?? chunkSize)
        setChunkOverlap(prefs.chunkOverlap ?? chunkOverlap)
        setEmbeddingSize(prefs.embeddingSize ?? embeddingSize)
      }
      setPrefsSaved(true)
    } catch (err) {
      setPrefsError(
        err instanceof Error
          ? err.message
          : t('settings.retrieval.saveFailed', {}, { defaultValue: 'Failed to save defaults.' }),
      )
    } finally {
      setPrefsSaving(false)
    }
  }

  async function generateToken(event: React.FormEvent) {
    event.preventDefault()
    if (!tokenLabel.trim()) return
    setTokenError(null)
    setNewToken(null)
    try {
      const res = await http.post('/api/api-tokens', { label: tokenLabel.trim() })
      const created = unwrapSingle<ApiTokenRecord & { token?: string }>(res)
      if (created) {
        setTokens((prev) => [
          {
            id: created.id,
            label: created.label,
            created_at: created.created_at,
            last_used_at: created.last_used_at ?? null,
          },
          ...prev,
        ])
        setNewToken(created.token ?? null)
      }
      setTokenLabel('')
      setTokenFormOpen(false)
    } catch (err) {
      setTokenError(
        err instanceof Error
          ? err.message
          : t('settings.apiKeys.createFailed', {}, { defaultValue: 'Failed to generate key.' }),
      )
    }
  }

  async function revokeToken(id: string) {
    try {
      await http.delete(`/api/api-tokens/${id}`)
      setTokens((prev) => prev.filter((tok) => tok.id !== id))
      setArmedRevokeId(null)
    } catch (_error) {
      // revoke failure is surfaced via localized message; error detail not exposed to user
      setTokenError(
        t('settings.apiKeys.revokeFailed', {}, { defaultValue: 'Failed to revoke key.' }),
      )
    }
  }

  const inputClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('medium'),
    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary outline-none transition-colors',
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Profile, API keys, and the retrieval defaults {{appName}} uses on every query.',
            },
          )}
        </p>
      </header>

      <form onSubmit={saveProfile} data-testid="settings-profile-form">
        <SectionCard
          title={t('nav.profile', {}, { defaultValue: 'Profile' })}
          description={t(
            'settings.profile.description',
            {},
            { defaultValue: 'Public to your team — shows up next to your questions.' },
          )}
        >
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-bold text-on-surface-variant',
                )}
                style={{ fontSize: 10 }}
              >
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="settings-name"
                className={inputClass}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-bold text-on-surface-variant',
                )}
                style={{ fontSize: 10 }}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="settings-email"
                className={inputClass}
              />
            </label>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <button
              type="submit"
              disabled={profileSaving}
              data-testid="settings-profile-save"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary disabled:opacity-50 hover:opacity-90 transition-opacity',
              )}
            >
              {profileSaving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
            </button>
            {profileSaved ? (
              <span
                data-testid="settings-profile-saved"
                className={cm.cn(cm.textSize('xs'), 'text-success font-semibold')}
              >
                {t('common.saved', {}, { defaultValue: 'Saved' })}
              </span>
            ) : null}
            {profileError ? (
              <span
                data-testid="settings-profile-error"
                className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}
              >
                {profileError}
              </span>
            ) : null}
          </div>
        </SectionCard>
      </form>

      <form onSubmit={savePrefs} data-testid="settings-prefs-form">
        <SectionCard
          title={t('settings.retrieval.title', {}, { defaultValue: 'Retrieval defaults' })}
          description={t(
            'settings.retrieval.description',
            {},
            { defaultValue: 'These apply to every Q&A unless overridden in a specific space.' },
          )}
        >
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-3')}>
            <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-bold text-on-surface-variant',
                )}
                style={{ fontSize: 10 }}
              >
                {t('settings.retrieval.kLabel', {}, { defaultValue: 'Top-k chunks' })}
              </span>
              <input
                type="number"
                min={1}
                max={32}
                value={retrievalK}
                onChange={(e) => setRetrievalK(parseInt(e.target.value, 10) || 0)}
                data-testid="settings-retrieval-k"
                className={cm.cn(inputClass, 'tabular-nums')}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-bold text-on-surface-variant',
                )}
                style={{ fontSize: 10 }}
              >
                {t('settings.retrieval.chunkLabel', {}, { defaultValue: 'Chunk size (words)' })}
              </span>
              <input
                type="number"
                min={50}
                max={2048}
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value, 10) || 0)}
                data-testid="settings-chunk-size"
                className={cm.cn(inputClass, 'tabular-nums')}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-bold text-on-surface-variant',
                )}
                style={{ fontSize: 10 }}
              >
                {t('settings.retrieval.overlapLabel', {}, { defaultValue: 'Chunk overlap' })}
              </span>
              <input
                type="number"
                min={0}
                max={512}
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value, 10) || 0)}
                data-testid="settings-chunk-overlap"
                className={cm.cn(inputClass, 'tabular-nums')}
              />
            </label>
          </div>
          <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t(
                'settings.retrieval.modelLabel',
                {},
                { defaultValue: 'Embedding model (planned, not used by FTS retriever)' },
              )}
            </span>
            <select
              value={embeddingSize}
              onChange={(e) => setEmbeddingSize(e.target.value as 'large' | 'small')}
              data-testid="settings-embedding-size"
              className={inputClass}
            >
              <option value="large">OpenAI embedding-3-large (3072 dim)</option>
              <option value="small">OpenAI embedding-3-small (1536 dim)</option>
            </select>
          </label>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <button
              type="submit"
              disabled={prefsSaving}
              data-testid="settings-prefs-save"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary disabled:opacity-50 hover:opacity-90 transition-opacity',
              )}
            >
              {prefsSaving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.retrieval.save', {}, { defaultValue: 'Save defaults' })}
            </button>
            {prefsSaved ? (
              <span
                data-testid="settings-prefs-saved"
                className={cm.cn(cm.textSize('xs'), 'text-success font-semibold')}
              >
                {t('common.saved', {}, { defaultValue: 'Saved' })}
              </span>
            ) : null}
            {prefsError ? (
              <span
                data-testid="settings-prefs-error"
                className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}
              >
                {prefsError}
              </span>
            ) : null}
          </div>
        </SectionCard>
      </form>

      <SectionCard
        title={t('footer.language', {}, { defaultValue: 'Language' })}
        description={t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      >
        <LanguagePicker />
      </SectionCard>
      <SectionCard
        title={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        description={t(
          'common.toggleLightDark',
          {},
          { defaultValue: 'Toggle between light and dark mode.' },
        )}
      >
        <ThemeToggle />
      </SectionCard>

      <SectionCard
        title={t('settings.apiKeys.title', {}, { defaultValue: 'API keys' })}
        description={t(
          'settings.apiKeys.description',
          {},
          {
            defaultValue:
              'Use these to call /v1/qa/ask, /v1/documents, and /v1/sources from your services.',
          },
        )}
      >
        {newToken ? (
          <div
            data-testid="settings-token-display"
            className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-success/10 border border-success/30')}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-semibold text-success uppercase tracking-widest',
              )}
            >
              {t(
                'settings.apiKeys.copyNow',
                {},
                { defaultValue: 'Copy this — you won\u2019t see it again' },
              )}
            </p>
            <code className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'block font-mono break-all')}>
              {newToken}
            </code>
          </div>
        ) : null}
        {!tokenFormOpen ? (
          <button
            type="button"
            onClick={() => {
              setTokenFormOpen(true)
              setNewToken(null)
            }}
            data-testid="settings-new-token"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity inline-flex items-center gap-1 self-start shadow-md shadow-primary/20',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              key
            </span>
            {t('settings.apiKeys.new', {}, { defaultValue: 'New API key' })}
          </button>
        ) : (
          <form
            onSubmit={generateToken}
            data-testid="settings-token-form"
            className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
          >
            <input
              type="text"
              value={tokenLabel}
              onChange={(e) => setTokenLabel(e.target.value)}
              placeholder={t(
                'settings.apiKeys.labelPlaceholder',
                {},
                { defaultValue: 'Production / Staging / CI' },
              )}
              data-testid="settings-token-label"
              className={cm.cn(inputClass, 'flex-1 min-w-[200px]')}
            />
            <button
              type="submit"
              disabled={!tokenLabel.trim()}
              data-testid="settings-token-create"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity inline-flex items-center gap-1 shadow-md shadow-primary/20 disabled:opacity-50',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 18 }}
                aria-hidden="true"
              >
                key
              </span>
              {t('settings.apiKeys.create', {}, { defaultValue: 'Generate new key' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setTokenFormOpen(false)
                setTokenLabel('')
                setTokenError(null)
              }}
              data-testid="settings-token-cancel"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full text-on-surface-variant hover:bg-surface-container transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </form>
        )}
        {tokenError ? (
          <p data-testid="settings-token-error" className={cm.cn(cm.textSize('xs'), 'text-error')}>
            {tokenError}
          </p>
        ) : null}
        {tokens.length > 0 ? (
          <div
            className={cm.cn(
              'rounded-xl bg-surface-container-low border border-outline-variant/30 overflow-hidden',
            )}
          >
            <table className={cm.cn('w-full text-left')}>
              <thead className={cm.cn('bg-surface-container')}>
                <tr>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.apiKeys.col.name', {}, { defaultValue: 'Label' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.apiKeys.col.created', {}, { defaultValue: 'Created' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right',
                    )}
                  >
                    {t('settings.apiKeys.col.lastUsed', {}, { defaultValue: 'Last used' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right',
                    )}
                  >
                    {t('nav.actions', {}, { defaultValue: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody
                data-testid="settings-token-list"
                className={cm.cn('divide-y divide-surface-container')}
              >
                {tokens.map((k) => (
                  <tr
                    key={k.id}
                    data-testid={`settings-token-row-${k.id}`}
                    className={cm.cn('hover:bg-surface-container transition-colors')}
                  >
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'font-semibold',
                      )}
                    >
                      {k.label}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'tabular-nums text-on-surface-variant',
                      )}
                    >
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'tabular-nums text-on-surface-variant text-right',
                      )}
                    >
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : '\u2014'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-right',
                      )}
                    >
                      {armedRevokeId === k.id ? (
                        <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                          <button
                            type="button"
                            onClick={() => revokeToken(k.id)}
                            data-testid={`settings-token-confirm-${k.id}`}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              'font-bold rounded-full bg-error text-white',
                            )}
                          >
                            {t('common.confirm', {}, { defaultValue: 'Confirm' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => setArmedRevokeId(null)}
                            className={cm.cn(
                              cm.textSize('xs'),
                              'font-semibold text-on-surface-variant hover:underline',
                            )}
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setArmedRevokeId(k.id)}
                          data-testid={`settings-token-revoke-${k.id}`}
                          className={cm.cn(
                            cm.textSize('xs'),
                            'font-semibold text-error hover:underline',
                          )}
                        >
                          {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p
            data-testid="settings-tokens-empty"
            className={cm.cn(cm.sp('py', 4), cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'settings.apiKeys.empty',
              { appName: APP_NAME },
              { defaultValue: 'No API keys yet — generate one to call the {{appName}} API.' },
            )}
          </p>
        )}
      </SectionCard>
    </div>
  )
}
