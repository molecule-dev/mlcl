import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface SavedSearch {
  id: string
  name: string
  query: string
  query_string?: string
  owner: string
  shared: boolean
  last_run_at: string
  result_count: number
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function loadSaved(http: ReturnType<typeof useHttpClient>): Promise<SavedSearch[]> {
  return http.get('/api/saved').then((res) => unwrapList<SavedSearch>(res))
}

export function Saved() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [items, setItems] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQuery, setNewQuery] = useState('')
  const [newShared, setNewShared] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Two-step inline confirm for the destructive delete: the first click arms
  // the row (Confirm/Cancel), the second fires. Auto-disarms so a stale
  // armed row can never delete on an accidental later click.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadSaved(http)
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('saved.loadError', {}, { defaultValue: 'Failed to load saved searches.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function openCreate() {
    setNewName('')
    setNewQuery('')
    setNewShared(false)
    setCreateError(null)
    setShowCreate(true)
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newQuery.trim()) return
    setSubmitting(true)
    setCreateError(null)
    try {
      const created = (await http.post('/api/saved-searches', {
        name: newName.trim(),
        query_string: newQuery.trim(),
        shared: newShared,
      })) as { id?: string; data?: { id?: string } }
      track({
        name: 'saved.created',
        properties: {
          saved_search_id: created?.id ?? created?.data?.id ?? null,
          name: newName.trim(),
          shared: newShared,
        },
      })
      setShowCreate(false)
      setItems(await loadSaved(http))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/maxSavedSearches|saved-search limit/i.test(msg)) {
        setCreateError(
          t(
            'saved.createLimitError',
            {},
            { defaultValue: 'You have reached your saved-search limit. Upgrade to save more.' },
          ),
        )
      } else {
        setCreateError(
          msg || t('saved.createError', {}, { defaultValue: 'Could not save search.' }),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteSaved(id: string) {
    setDeletingId(id)
    try {
      await http.delete(`/api/saved-searches/${id}`)
      track({ name: 'saved.deleted', properties: { saved_search_id: id } })
      setItems(await loadSaved(http))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('saved.deleteError', {}, { defaultValue: 'Could not delete saved search.' }),
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-end justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('saved.eyebrow', {}, { defaultValue: '$ signalink saved' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('saved.heading', {}, { defaultValue: 'Saved searches & dashboards' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'saved.subheading',
              {},
              {
                defaultValue:
                  'Pin queries you re-run during incidents and share the team-wide ones.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          data-mol-id="saved-new"
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
        >
          {t('saved.newCta', {}, { defaultValue: '+ New saved search' })}
        </button>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('saved.loading', {}, { defaultValue: 'Loading saved searches…' })}
        </p>
      ) : items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('saved.empty', {}, { defaultValue: 'You have not saved any searches yet.' })}
        </p>
      ) : (
        <ul className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {items.map((s) => (
            <li key={s.id}>
              <article
                className={cm.cn(
                  'rounded-xl p-5 h-full transition-all hover:-translate-y-0.5 hover:shadow-xl',
                )}
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className={cm.cn('flex items-start justify-between gap-2')}>
                  <h3 className={cm.cn('font-mono text-base font-bold text-on-surface truncate')}>
                    {s.name}
                  </h3>
                  <div className={cm.cn('flex items-center gap-2')}>
                    {s.shared ? (
                      <span
                        className={cm.cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                        )}
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-primary) 16%, transparent)',
                          color: 'var(--color-primary-hover)',
                        }}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[12px]')}
                          aria-hidden="true"
                        >
                          groups
                        </span>
                        {t('status.shared', {}, { defaultValue: 'Shared' })}
                      </span>
                    ) : (
                      <span
                        className={cm.cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                        )}
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                          color: 'var(--color-accent-hover)',
                        }}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[12px]')}
                          aria-hidden="true"
                        >
                          person
                        </span>
                        {t('saved.private', {}, { defaultValue: 'Private' })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmingId(confirmingId === s.id ? null : s.id)}
                      disabled={deletingId === s.id}
                      data-mol-id={`saved-delete-${s.id}`}
                      aria-label={t(
                        'saved.delete',
                        { name: s.name },
                        { defaultValue: 'Delete {{name}}' },
                      )}
                      className={cm.cn(
                        'p-1.5 rounded text-on-surface-variant hover:text-error transition-colors disabled:opacity-50',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        delete
                      </span>
                    </button>
                  </div>
                </div>
                {confirmingId === s.id ? (
                  <div
                    className={cm.cn(
                      'mt-3 flex items-center justify-between gap-3 rounded-md px-3 py-2',
                    )}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-severity-error) 12%, transparent)',
                      border:
                        '1px solid color-mix(in srgb, var(--color-severity-error) 40%, transparent)',
                    }}
                    data-mol-id={`saved-confirm-${s.id}`}
                  >
                    <p className={cm.cn('font-mono text-xs text-on-surface')}>
                      {t('saved.deleteConfirm', {}, { defaultValue: 'Delete this saved search?' })}
                    </p>
                    <div className={cm.cn('flex items-center gap-2')}>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        data-mol-id={`saved-cancel-${s.id}`}
                        className={cm.cn(
                          'px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-widest border border-outline-variant',
                        )}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(null)
                          void deleteSaved(s.id)
                        }}
                        disabled={deletingId === s.id}
                        data-mol-id={`saved-confirm-delete-${s.id}`}
                        className={cm.cn(
                          'px-2.5 py-1 rounded font-mono text-[11px] font-bold uppercase tracking-widest text-error disabled:opacity-50',
                        )}
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-severity-error) 20%, transparent)',
                        }}
                      >
                        {deletingId === s.id
                          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                          : t('saved.deleteConfirmYes', {}, { defaultValue: 'Delete' })}
                      </button>
                    </div>
                  </div>
                ) : null}
                <p
                  className={cm.cn(
                    'mt-3 font-mono text-xs px-3 py-2 rounded-md whitespace-pre-wrap break-words',
                  )}
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                  title={s.query || s.query_string}
                >
                  {s.query || s.query_string}
                </p>
                <div className={cm.cn('mt-4 flex items-end justify-between')}>
                  <div>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('saved.col.results', {}, { defaultValue: 'Results' })}
                    </p>
                    <p
                      className={cm.cn(
                        'font-mono text-xl font-extrabold tracking-tighter text-on-surface',
                      )}
                    >
                      {s.result_count.toLocaleString()}
                    </p>
                  </div>
                  <p className={cm.cn('font-mono text-[11px] text-on-surface-variant')}>
                    {t(
                      'saved.lastRunBy',
                      { when: fmtRelative(s.last_run_at), owner: s.owner },
                      { defaultValue: '{{when}} · {{owner}}' },
                    )}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {showCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-create-title"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center px-4')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-background) 65%, transparent)',
          }}
        >
          <form
            onSubmit={submitCreate}
            className={cm.cn('w-full max-w-md rounded-xl p-6 space-y-4')}
            style={{
              backgroundColor: 'var(--color-input-background)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              id="saved-create-title"
              className={cm.cn('text-lg font-semibold tracking-tight text-on-surface')}
            >
              {t('saved.create.title', {}, { defaultValue: 'New saved search' })}
            </h2>
            <div>
              <label
                htmlFor="saved-new-name"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </label>
              <input
                id="saved-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="saved-new-query"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('saved.create.queryLabel', {}, { defaultValue: 'Query' })}
              </label>
              <input
                id="saved-new-query"
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                required
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              />
            </div>
            <div className={cm.cn('flex items-center gap-2')}>
              <input
                id="saved-new-shared"
                type="checkbox"
                checked={newShared}
                onChange={(e) => setNewShared(e.target.checked)}
              />
              <label
                htmlFor="saved-new-shared"
                className={cm.cn('font-mono text-xs text-on-surface-variant')}
              >
                {t('saved.create.sharedLabel', {}, { defaultValue: 'Share with team' })}
              </label>
            </div>
            {createError ? (
              <div className={cm.cn('text-sm text-error')}>
                {createError}{' '}
                {/maxSavedSearches|saved-search limit|Upgrade to save/i.test(createError) ? (
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className={cm.cn('underline font-bold')}
                    style={{ color: BRAND_COLOR }}
                  >
                    {t('saved.create.upgradeLink', {}, { defaultValue: 'Upgrade plan' })}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className={cm.cn('flex items-center justify-end gap-3 pt-2')}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={submitting || !newName.trim() || !newQuery.trim()}
                data-mol-id="saved-create-submit"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
              >
                {submitting
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('saved.create.submit', {}, { defaultValue: 'Save search' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
