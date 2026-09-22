import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnArticleRow } from '../components/CairnArticleRow.js'
import type { CairnArticleStatus } from '../components/CairnArticleStatusPill.js'
import { extractExcerpt } from '../lib/markdown.js'
import { unwrapList } from '../lib/unwrap.js'

interface DraftRow {
  id: string
  title: string
  excerpt: string
  space_name: string
  section_path?: string[]
  author_name: string
  author_initials: string
  status: CairnArticleStatus
  updated_at: string
  bookmarked?: boolean
}

interface ApiArticle {
  id: string
  title: string
  body_md?: string
  status: CairnArticleStatus
  updated_at: string
}

export function Drafts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<'all' | 'recent' | 'bookmarked'>('all')
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    Promise.all([
      http.get('/articles'),
      // The bookmark resource drives the "Bookmarked" filter chip.
      http.get('/bookmarks').catch(() => null),
    ])
      .then(([aRes, bRes]) => {
        if (cancelled) return
        const bookmarkedIds = new Set(
          unwrapList<{ resourceType: string; resourceId: string }>(bRes)
            .filter((b) => b.resourceType === 'article')
            .map((b) => b.resourceId),
        )
        const items = unwrapList<ApiArticle>(aRes).filter((a) => a.status === 'draft')
        setDrafts(
          items.map((a) => ({
            id: a.id,
            title: a.title,
            excerpt: extractExcerpt(a.body_md ?? ''),
            space_name: '',
            author_name: '',
            author_initials: '',
            status: 'draft' as CairnArticleStatus,
            updated_at: a.updated_at,
            bookmarked: bookmarkedIds.has(a.id),
          })),
        )
      })
      .catch(() => {
        if (cancelled) return
        setDrafts([])
        setLoadError(t('drafts.loadFailed', {}, { defaultValue: 'Could not load your drafts.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = (drafts ?? []).filter((d) => {
    if (filter === 'bookmarked') return d.bookmarked
    if (filter === 'recent') {
      return Date.now() - new Date(d.updated_at).getTime() < 1000 * 60 * 60 * 24
    }
    return true
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('drafts.eyebrow', {}, { defaultValue: 'Your unfinished work' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('drafts.heading', {}, { defaultValue: 'Drafts' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'drafts.subtitle',
              {},
              {
                defaultValue:
                  'Articles you have started but not yet published. Pick one up and keep going.',
              },
            )}
          </p>
        </div>
      </header>

      <nav className={cm.flex({ align: 'center', gap: 'sm' })}>
        {(['all', 'recent', 'bookmarked'] as const).map((opt) => {
          const isActive = filter === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {t(
                `drafts.filter.${opt}`,
                {},
                {
                  defaultValue:
                    opt === 'all'
                      ? 'All drafts'
                      : opt === 'recent'
                        ? 'Touched today'
                        : 'Bookmarked',
                },
              )}
            </button>
          )
        })}
      </nav>

      {loadError ? (
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
          {loadError}
        </p>
      ) : drafts === null ? (
        <div className={cm.cn('space-y-3')} aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cm.cn(
                cm.sp('p', 4),
                'animate-pulse rounded-xl bg-surface-container ring-1 ring-outline-variant',
              )}
            >
              <div className="h-4 w-1/3 rounded bg-surface-container-high" />
              <div
                className={cm.cn(cm.sp('mt', 2), 'h-3 w-2/3 rounded bg-surface-container-high')}
              />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
          {t(
            'drafts.empty',
            {},
            { defaultValue: 'No drafts in this view. Time to start writing.' },
          )}
        </p>
      ) : (
        <div className={cm.cn('space-y-3')}>
          {filtered.map((d) => (
            <CairnArticleRow
              key={d.id}
              id={d.id}
              title={d.title}
              excerpt={d.excerpt}
              spaceName={d.space_name}
              sectionPath={d.section_path}
              authorName={d.author_name}
              authorInitials={d.author_initials}
              status={d.status}
              updatedAt={d.updated_at}
              bookmarked={d.bookmarked}
              href={`/article/${d.id}/edit`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Drafts
