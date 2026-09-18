import { useEffect, useState } from 'react'

import { t as translate } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnArticleRow } from '../components/CairnArticleRow.js'
import type { CairnArticleStatus } from '../components/CairnArticleStatusPill.js'
import { extractExcerpt } from '../lib/markdown.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface BookmarkRow {
  id: string
  userId: string
  resourceType: string
  resourceId: string
  folder: string | null
  createdAt: string
}

interface ApiArticle {
  id: string
  space_id: string
  title: string
  body_md?: string
  status: CairnArticleStatus
  updated_at: string
}

interface ApiSpace {
  id: string
  key: string
  name: string
}

interface DisplayRow {
  id: string
  title: string
  excerpt: string
  space_name: string
  status: CairnArticleStatus
  updated_at: string
  bookmarkId: string
}

export function Bookmarks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<DisplayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([http.get('/bookmarks'), http.get('/articles'), http.get('/spaces')])
      .then(async ([bRes, aRes, sRes]) => {
        if (cancelled) return
        const bookmarks = unwrapList<BookmarkRow>(bRes).filter((b) => b.resourceType === 'article')
        const articles = unwrapList<ApiArticle>(aRes)
        const spaces = unwrapList<ApiSpace>(sRes)
        const articleById = new Map(articles.map((a) => [a.id, a]))
        // GET /articles only returns the user's OWN articles — bookmarks on
        // teammates' articles won't be in that list, so fetch those by id
        // (GET /articles/:id honors space-membership read access).
        const missing = bookmarks.filter((b) => !articleById.has(b.resourceId))
        if (missing.length > 0) {
          const fetched = await Promise.all(
            missing.map((b) =>
              http
                .get(`/articles/${b.resourceId}`)
                .then((res) => unwrapSingle<ApiArticle>(res))
                .catch(() => null),
            ),
          )
          for (const a of fetched) {
            if (a) articleById.set(a.id, a)
          }
        }
        if (cancelled) return
        const spaceById = new Map(spaces.map((s) => [s.id, s]))
        const display: DisplayRow[] = bookmarks.flatMap((b) => {
          const a = articleById.get(b.resourceId)
          if (!a) return []
          const sp = spaceById.get(a.space_id)
          return [
            {
              id: a.id,
              title: a.title,
              excerpt: extractExcerpt(a.body_md ?? ''),
              space_name: sp?.name ?? '',
              status: a.status,
              updated_at: a.updated_at,
              bookmarkId: b.id,
            },
          ]
        })
        setRows(display)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : translate('bookmarks.loadFailed', {}, { defaultValue: 'Could not load bookmarks' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleRemove(articleId: string) {
    try {
      await http.delete(`/bookmarks/article/${articleId}`)
      setRows((prev) => prev.filter((r) => r.id !== articleId))
    } catch (_error) {
      // Best-effort UI; reload to recover from error states
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('bookmarks.eyebrow', {}, { defaultValue: 'Your starred reads' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 1),
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight',
          )}
        >
          {t('bookmarks.heading', {}, { defaultValue: 'Bookmarks' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'bookmarks.subtitle',
            {},
            { defaultValue: 'Articles you saved so you would not have to remember the URL.' },
          )}
        </p>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
          {t('bookmarks.loading', {}, { defaultValue: 'Loading bookmarks\u2026' })}
        </p>
      ) : error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-lg bg-error/10 text-error',
          )}
        >
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
          {t(
            'bookmarks.empty',
            {},
            {
              defaultValue:
                'No bookmarks yet. Tap the bookmark icon on an article to save it for later.',
            },
          )}
        </p>
      ) : (
        <div className={cm.cn('space-y-3')}>
          {rows.map((b) => (
            <div key={b.bookmarkId} className={cm.flex({ align: 'start', gap: 'sm' })}>
              <div className={cm.cn('min-w-0 flex-1')}>
                <CairnArticleRow
                  id={b.id}
                  title={b.title}
                  excerpt={b.excerpt}
                  spaceName={b.space_name}
                  authorName=""
                  authorInitials=""
                  status={b.status}
                  updatedAt={b.updated_at}
                  bookmarked
                />
              </div>
              <button
                type="button"
                aria-label={t('bookmarks.remove', {}, { defaultValue: 'Remove bookmark' })}
                onClick={() => handleRemove(b.id)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-9 w-9 shrink-0 rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  aria-hidden="true"
                  style={{ fontSize: '1.125rem' }}
                >
                  bookmark_remove
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Bookmarks
