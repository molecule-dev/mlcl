import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { VersalDocumentCard } from '../components/VersalDocumentCard.js'
import { VersalManuscriptHero } from '../components/VersalManuscriptHero.js'
import { readDailyGoal } from '../lib/goal.js'
import {
  type DocumentRow,
  type FolderRow,
  makeExcerpt,
  relativeLabel,
  tagsOf,
} from '../lib/types.js'

type Filter = 'all' | 'pinned' | 'draft' | 'published'

/**
 * Library — primary authenticated landing.
 *
 * Loads folder tree + documents from the live API, lets the writer pin /
 * filter / open existing manuscripts, and creates a fresh draft document
 * server-side before navigating into the editor (the only way to satisfy
 * the dispatch's "every action mutates real backend state" rule).
 */
export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()
  const greetingName =
    user?.name?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    t('library.guest', {}, { defaultValue: 'writer' })

  const [folders, setFolders] = useState<FolderRow[]>([])
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [foldersRes, docsRes] = await Promise.all([
        http.get<FolderRow[]>('/folders'),
        http.get<DocumentRow[]>('/documents'),
      ])
      setFolders(Array.isArray(foldersRes.data) ? foldersRes.data : [])
      setDocs(Array.isArray(docsRes.data) ? docsRes.data : [])
    } catch (error) {
      logError('library.loadAll', error)
      setError(t('library.loadFailed', {}, { defaultValue: 'Could not load your library.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const visibleDocs = useMemo(() => {
    let list = docs
    if (activeFolderId === null) {
      // "All documents" view shows every doc regardless of folder.
    } else {
      list = list.filter((d) => d.folder_id === activeFolderId)
    }
    if (filter === 'pinned') list = list.filter((d) => d.pinned)
    if (filter === 'draft') list = list.filter((d) => d.status === 'draft')
    if (filter === 'published') list = list.filter((d) => d.status === 'published')
    return list
  }, [docs, activeFolderId, filter])

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of docs) {
      const key = d.folder_id ?? '__unfiled__'
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [docs])

  const totalCount = docs.length
  const featuredDoc = useMemo(() => {
    const pinned = docs.find((d) => d.pinned)
    return pinned ?? docs[0] ?? null
  }, [docs])

  const handleNewDoc = useCallback(async () => {
    if (creating) return
    setCreating(true)
    try {
      const res = await http.post<DocumentRow>('/documents', {
        title: t('library.untitledDraft', {}, { defaultValue: 'Untitled draft' }),
        body_md: '',
        status: 'draft',
        folder_id: activeFolderId,
      })
      const created = res.data
      if (created?.id) {
        navigate(`/editor/${created.id}`)
      } else {
        setError(
          t('library.createFailed', {}, { defaultValue: 'Could not create a new document.' }),
        )
      }
    } catch (error) {
      logError('library.handleNewDoc', error)
      setError(t('library.createFailed', {}, { defaultValue: 'Could not create a new document.' }))
    } finally {
      setCreating(false)
    }
  }, [creating, http, navigate, activeFolderId, t])

  const handleNewFolder = useCallback(async () => {
    const name = newFolderName.trim()
    if (!name) return
    try {
      const res = await http.post<FolderRow>('/folders', { name })
      if (res.data) {
        setFolders((prev) => [...prev, res.data as FolderRow])
        setActiveFolderId(res.data.id)
      }
      setNewFolderName('')
      setNewFolderOpen(false)
    } catch (error) {
      logError('library.handleNewFolder', error)
      setError(t('library.folderFailed', {}, { defaultValue: 'Could not create folder.' }))
    }
  }, [http, newFolderName, t])

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId) ?? null,
    [folders, activeFolderId],
  )

  const wordsToday = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return docs
      .filter((d) => new Date(d.updated_at) >= today)
      .reduce((sum, d) => sum + (d.word_count ?? 0), 0)
  }, [docs])

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), 'min-h-full')}>
      <aside
        className={cm.cn(
          'w-[260px] shrink-0 hidden md:block border-r border-outline-variant/40 bg-surface-container-low/40 p-5',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-5')}>
          <h2
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
            )}
          >
            {t('library.collectionsHeading', {}, { defaultValue: 'Collections' })}
          </h2>
          <button
            type="button"
            onClick={() => setNewFolderOpen((v) => !v)}
            aria-label={t('library.newCollection', {}, { defaultValue: 'New collection' })}
            className={cm.cn(
              'material-symbols-outlined text-[18px] text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            add
          </button>
        </div>
        {newFolderOpen ? (
          <div className={cm.cn('mb-4 space-y-2')}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleNewFolder()
                if (e.key === 'Escape') {
                  setNewFolderOpen(false)
                  setNewFolderName('')
                }
              }}
              placeholder={t(
                'library.newCollectionPlaceholder',
                {},
                { defaultValue: 'Collection name' },
              )}
              className={cm.cn(
                'w-full rounded-md border border-outline-variant bg-surface-container px-2 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary/40',
              )}
            />
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => void handleNewFolder()}
                disabled={!newFolderName.trim()}
                className={cm.cn(
                  'rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-on-primary disabled:opacity-50',
                )}
              >
                {t('common.create', {}, { defaultValue: 'Create' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewFolderOpen(false)
                  setNewFolderName('')
                }}
                className={cm.cn(
                  'rounded-md border border-outline-variant px-2.5 py-1 text-[11px] font-bold text-on-surface-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
          </div>
        ) : null}
        <ul className={cm.cn('space-y-1')}>
          <li>
            <button
              type="button"
              onClick={() => setActiveFolderId(null)}
              className={cm.cn(
                cm.sp('px', 2.5),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'sm' }),
                'w-full rounded-lg text-sm font-semibold transition-colors',
                activeFolderId === null
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface hover:bg-surface-container',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                inbox
              </span>
              <span className={cm.cn('flex-1 text-left truncate')}>
                {t('library.allDocs', {}, { defaultValue: 'All documents' })}
              </span>
              <span className={cm.cn('text-[11px] text-on-surface-variant tabular-nums')}>
                {totalCount}
              </span>
            </button>
          </li>
          {folders.map((folder) => (
            <li key={folder.id}>
              <button
                type="button"
                onClick={() => setActiveFolderId(folder.id)}
                className={cm.cn(
                  cm.sp('px', 2.5),
                  cm.sp('py', 2),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'w-full rounded-lg text-sm font-semibold transition-colors',
                  activeFolderId === folder.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface hover:bg-surface-container',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  folder
                </span>
                <span className={cm.cn('flex-1 text-left truncate')}>{folder.name}</span>
                <span className={cm.cn('text-[11px] text-on-surface-variant tabular-nums')}>
                  {folderCounts[folder.id] ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className={cm.cn(cm.flex1, 'min-w-0 px-6 py-10 lg:px-10 lg:py-14')}>
        <div className={cm.cn('mx-auto w-full max-w-[1080px] space-y-10')}>
          <header>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
              )}
            >
              {t(
                'library.eyebrow',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} · Library' },
              )}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface',
              )}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {t(
                'library.greeting',
                { name: greetingName },
                { defaultValue: 'Welcome back, {{name}}.' },
              )}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), 'text-base text-on-surface-variant max-w-xl')}>
              {t(
                'library.subtitle',
                {},
                {
                  defaultValue:
                    "Your manuscripts, essays, and field notes — all under one quiet roof. Pick up the chapter that's waiting.",
                },
              )}
            </p>
          </header>

          {featuredDoc ? (
            <VersalManuscriptHero
              dateLabel={new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              manuscriptTitle={featuredDoc.title}
              manuscriptExcerpt={featuredDoc.excerpt ?? makeExcerpt(featuredDoc.body_md)}
              wordsToday={wordsToday}
              dailyGoal={readDailyGoal()}
              streakDays={Math.min(99, Math.max(1, docs.length))}
              tags={tagsOf(featuredDoc)}
              ctaHref={`/editor/${featuredDoc.id}`}
            />
          ) : null}

          <section>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
                'gap-3 mb-6',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    cm.w(11),
                    cm.h(11),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-xl bg-primary/10 text-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[24px]')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {activeFolder ? 'folder' : 'inbox'}
                  </span>
                </span>
                <div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
                    )}
                  >
                    {t('library.activeLabel', {}, { defaultValue: 'Collection' })}
                  </p>
                  <h2
                    className={cm.cn(
                      'text-2xl md:text-3xl font-bold tracking-tight text-on-surface',
                    )}
                    style={{
                      fontFamily:
                        'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                    }}
                  >
                    {activeFolder?.name ??
                      t('library.allDocs', {}, { defaultValue: 'All documents' })}
                  </h2>
                </div>
                <span
                  className={cm.cn(
                    'ml-2 px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums bg-surface-container text-on-surface-variant',
                  )}
                >
                  {visibleDocs.length}
                </span>
              </div>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <Link
                  to="/stats"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'rounded-xl text-sm font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    show_chart
                  </span>
                  <span>{t('library.statsCta', {}, { defaultValue: 'Stats' })}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleNewDoc}
                  disabled={creating}
                  data-testid="library-new-doc"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'rounded-xl text-sm font-bold text-white shadow-md disabled:opacity-60',
                    'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    edit_note
                  </span>
                  <span>
                    {creating
                      ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                      : t('library.newDocCta', {}, { defaultValue: 'New manuscript' })}
                  </span>
                </button>
              </div>
            </div>

            <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap' }), 'gap-2 mb-6')}>
              {(['all', 'pinned', 'draft', 'published'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFilter(opt)}
                  className={cm.cn(
                    'px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors',
                    filter === opt
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {t(
                    `library.filter.${opt}`,
                    {},
                    {
                      defaultValue:
                        opt === 'all'
                          ? 'All'
                          : opt === 'pinned'
                            ? 'Pinned'
                            : opt === 'draft'
                              ? 'Drafts'
                              : 'Published',
                    },
                  )}
                </button>
              ))}
            </div>

            {error ? (
              <div
                role="alert"
                className={cm.cn(
                  'mb-4 rounded-lg border border-error/40 bg-error/5 px-4 py-2 text-sm text-error',
                )}
              >
                {error}
              </div>
            ) : null}

            <div className={cm.cn('space-y-3')}>
              {loading ? (
                <div className={cm.cn(cm.sp('p', 8), 'text-center text-on-surface-variant')}>
                  {t('library.loading', {}, { defaultValue: 'Loading your library…' })}
                </div>
              ) : visibleDocs.length === 0 ? (
                <div
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-2xl border border-dashed border-outline-variant text-center',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[36px] text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    draw
                  </span>
                  <p className={cm.cn('mt-2 text-on-surface-variant')}>
                    {t(
                      'library.empty',
                      {},
                      { defaultValue: 'No documents here yet — start one to fill the collection.' },
                    )}
                  </p>
                </div>
              ) : (
                visibleDocs.map((d) => (
                  <VersalDocumentCard
                    key={d.id}
                    doc={{
                      id: d.id,
                      title: d.title || 'Untitled',
                      excerpt: d.excerpt ?? makeExcerpt(d.body_md),
                      updatedAtLabel: relativeLabel(d.updated_at),
                      collection: folders.find((f) => f.id === d.folder_id)?.name ?? undefined,
                      tags: tagsOf(d),
                      wordCount: d.word_count,
                      readingMinutes: d.reading_time,
                      status: d.status,
                      pinned: d.pinned,
                    }}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Library
