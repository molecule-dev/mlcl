import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ThreadRow, type ThreadStatus } from '../components/ThreadRow.js'

interface Bookmark {
  id: string
  folder?: string
  thread: {
    id: string
    slug?: string
    title: string
    excerpt?: string
    author: { username: string; reputation?: number }
    category?: { name: string; slug: string; color?: string }
    reply_count: number
    view_count: number
    last_activity_at: string
    statuses?: ThreadStatus[]
  }
  saved_at: string
}

export function Bookmarks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    let cancelled = false
    http
      .get<{ data: Bookmark[] }>('/api/bookmarks-rich')
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.data ?? []
        setBookmarks(list)
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setBookmarks([])
        setError(e instanceof Error ? e.message : 'Failed to load bookmarks')
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(load, [http])

  const defaultFolder = t('bookmarks.defaultFolder', {}, { defaultValue: 'Saved' })
  const grouped = useMemo(() => {
    const map = new Map<string, Bookmark[]>()
    ;(bookmarks ?? []).forEach((b) => {
      const key = b.folder ?? defaultFolder
      const existing = map.get(key) ?? []
      existing.push(b)
      map.set(key, existing)
    })
    return Array.from(map.entries()).map(([folder, items]) => ({ folder, items }))
  }, [bookmarks, defaultFolder])

  const handleUnsave = async (id: string) => {
    setBookmarks((prev) => (prev ?? []).filter((b) => b.id !== id))
    try {
      await http.delete(`/api/bookmarks/${id}`)
    } catch (_error) {
      /* will reconcile on next load */
    }
  }

  return (
    <div className={cm.cn(cm.stack(8))}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('bookmarks.eyebrow', {}, { defaultValue: 'Saved threads' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('bookmarks.heading', {}, { defaultValue: 'The threads you keep going back to.' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'bookmarks.subtitle',
            {},
            {
              defaultValue:
                'Bookmarks are private and survive thread locks. Group them into folders to organize a personal canon.',
            },
          )}
        </p>
      </header>

      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')} role="alert">
          {error}
        </p>
      )}

      {bookmarks === null ? (
        <p className={cm.textMuted}>
          {t('bookmarks.loading', {}, { defaultValue: 'Loading bookmarks…' })}
        </p>
      ) : (bookmarks ?? []).length === 0 ? (
        <p className={cm.textMuted}>
          {t(
            'bookmarks.empty',
            {},
            {
              defaultValue:
                "You haven't saved any threads yet. Bookmark something worth coming back to.",
            },
          )}
        </p>
      ) : (
        <div className={cm.stack(8)}>
          {grouped.map((group) => (
            <section key={group.folder} className={cm.stack(3)}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  'flex-wrap',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {group.folder}
                </h2>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'bookmarks.folderCount',
                    { count: group.items.length.toLocaleString() },
                    { defaultValue: '{{count}} saved' },
                  )}
                </span>
              </div>
              <div
                className={cm.cn(
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden',
                )}
              >
                {group.items.map((bookmark) => (
                  <div key={bookmark.id} className={cm.cn(cm.flex({ align: 'stretch' }))}>
                    <div className={cm.cn(cm.flex1)}>
                      <ThreadRow
                        id={bookmark.thread.id}
                        slug={bookmark.thread.slug}
                        title={bookmark.thread.title}
                        excerpt={bookmark.thread.excerpt}
                        author={bookmark.thread.author}
                        category={bookmark.thread.category}
                        replyCount={bookmark.thread.reply_count}
                        viewCount={bookmark.thread.view_count}
                        lastActivityAt={bookmark.thread.last_activity_at}
                        statuses={bookmark.thread.statuses}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnsave(bookmark.id)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        'inline-flex items-center text-on-surface-variant hover:text-error hover:bg-error-light transition-colors border-l border-outline-variant/30',
                      )}
                      aria-label={t('bookmarks.unsave', {}, { defaultValue: 'Unsave' })}
                    >
                      <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                        bookmark_remove
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default Bookmarks
