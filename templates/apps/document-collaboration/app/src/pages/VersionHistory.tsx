import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface VersionRow {
  id: string
  document_id: string
  author_id: string
  version: number
  change_summary: string | null
  content: { blocks?: Array<{ type: string; text?: string }> } | null
  created_at: string
}

interface DocRow {
  id: string
  title: string
  version: number
  content: { blocks?: Array<{ type: string; text?: string }> } | null
  share_role?: string
  owner_id: string
}

const CURSOR_PALETTE = ['#4f46e5', '#e11d48', '#16a34a', '#d97706', '#7c3aed'] as const
function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CURSOR_PALETTE[h % CURSOR_PALETTE.length]!
}

function initialsFor(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9]/g, '')
  return (cleaned.slice(0, 2) || 'UU').toUpperCase()
}

function fmtRelative(iso: string, t: TranslateFunction): string {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

function previewText(content: VersionRow['content']): string {
  const blocks = content?.blocks ?? []
  return blocks
    .filter((b) => b.type === 'paragraph' && b.text)
    .map((b) => b.text)
    .join('\n\n')
    .slice(0, 1500)
}

export function VersionHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const docId = params.id ?? ''

  const [versions, setVersions] = useState<VersionRow[]>([])
  const [doc, setDoc] = useState<DocRow | null>(null)
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!docId) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/documents/${docId}`), http.get(`/api/versions/${docId}`)])
      .then(([docRes, versRes]) => {
        if (cancelled) return
        const d = unwrapSingle<DocRow>(docRes)
        const list = unwrapList<VersionRow>(versRes)
        setDoc(d)
        setVersions(list)
        if (list.length > 0) setActiveId(list[0]!.id)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('versionHistory.loadFailed', {}, { defaultValue: 'Could not load history.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [docId, http, t])

  const active = useMemo(
    () => versions.find((v) => v.id === activeId) ?? versions[0] ?? null,
    [versions, activeId],
  )

  const restore = async (): Promise<void> => {
    if (!active || !doc) return
    setBusy(true)
    setError(null)
    try {
      await http.post(`/api/versions/${docId}/restore/${active.id}`, {})
      const refreshed = await http.get(`/api/versions/${docId}`)
      setVersions(unwrapList<VersionRow>(refreshed))
    } catch (error) {
      logError('versionHistory.restore', error)
      setError(t('versionHistory.restoreFailed', {}, { defaultValue: 'Restore failed.' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}
      data-testid="version-history-root"
    >
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <Link
            to={`/doc/${docId}`}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            ← {t('versionHistory.backToDoc', {}, { defaultValue: 'Back to manuscript' })}
          </Link>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {doc?.title ?? t('versionHistory.heading', {}, { defaultValue: 'Version history' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'versionHistory.subtitle',
              { count: versions.length },
              { defaultValue: '{{count}} revisions saved · nothing is lost.' },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border-l-4 border-l-error bg-error/5 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : versions.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}
          data-testid="version-history-empty"
        >
          {t(
            'versionHistory.empty',
            {},
            { defaultValue: 'No revisions yet — save the document to start its history.' },
          )}
        </p>
      ) : (
        <div className={cm.grid({ cols: 12, gap: 'md' })} data-testid="version-history-grid">
          <ol className={cm.cn('col-span-12 lg:col-span-5 relative space-y-2 pl-6')}>
            <span
              aria-hidden="true"
              className={cm.cn('absolute left-3 top-2 bottom-2 w-px bg-outline-variant')}
            />
            {versions.map((v, idx) => {
              const isActive = (active?.id ?? '') === v.id
              const isLatest = idx === 0
              const dotColor = isLatest ? 'bg-primary' : 'bg-outline'
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(v.id)}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'sm' }),
                      cm.sp('p', 4),
                      cm.w('full'),
                      'group relative rounded-2xl text-left transition-colors',
                      isActive
                        ? 'bg-primary/5 ring-1 ring-primary/30'
                        : 'hover:bg-surface-container',
                    )}
                    data-testid={`version-item-${v.id}`}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'absolute -left-3 top-6 inline-flex h-3 w-3 rounded-full ring-4 ring-surface-container-low',
                        dotColor,
                      )}
                    />
                    <span
                      className={cm.cn(
                        'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow-sm',
                      )}
                      style={{ backgroundColor: colorFor(v.author_id) }}
                      aria-hidden="true"
                    >
                      {initialsFor(v.author_id)}
                    </span>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <p
                          className={cm.cn(
                            cm.fontWeight('extrabold'),
                            cm.textSize('sm'),
                            'text-on-surface',
                          )}
                        >
                          {t(
                            'versionHistory.versionLabel',
                            { n: v.version },
                            { defaultValue: 'Version {{n}}' },
                          )}
                        </p>
                        {isLatest ? (
                          <span
                            className={cm.cn(
                              'rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary',
                            )}
                          >
                            {t('versionHistory.latest', {}, { defaultValue: 'Latest' })}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cm.cn(
                          cm.sp('mt', 1),
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                        )}
                      >
                        {fmtRelative(v.created_at, t)}
                      </p>
                      {v.change_summary ? (
                        <p
                          className={cm.cn(
                            cm.sp('mt', 2),
                            cm.textSize('xs'),
                            'text-on-surface-variant italic',
                          )}
                        >
                          {v.change_summary}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>

          <aside
            className={cm.cn(
              'col-span-12 lg:col-span-7',
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
            )}
            data-testid="version-preview"
          >
            <div
              className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('extrabold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('versionHistory.previewing', {}, { defaultValue: 'Previewing' })}
                </p>
                <h2
                  className={cm.cn(cm.sp('mt', 1), cm.textSize('xl'), cm.fontWeight('extrabold'))}
                >
                  {active
                    ? t(
                        'versionHistory.versionLabel',
                        { n: active.version },
                        { defaultValue: 'Version {{n}}' },
                      )
                    : '—'}
                </h2>
              </div>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={restore}
                  disabled={busy || !active || (doc !== null && doc.version === active.version)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('extrabold'),
                    'rounded-full bg-primary text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0',
                  )}
                  data-testid="version-restore"
                >
                  {t('versionHistory.restore', {}, { defaultValue: 'Restore this version' })}
                </button>
              </div>
            </div>

            <pre
              className={cm.cn(
                cm.sp('mt', 6),
                'whitespace-pre-wrap text-[15px] leading-[1.7] text-on-surface',
              )}
              style={{ fontFamily: 'Charter, Georgia, serif' }}
              data-testid="version-preview-body"
            >
              {previewText(active?.content ?? null) ||
                t(
                  'versionHistory.noContent',
                  {},
                  { defaultValue: 'No content captured for this revision.' },
                )}
            </pre>
          </aside>
        </div>
      )}
    </div>
  )
}

export default VersionHistory
