import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { get, post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ConfidenceMeter } from '../components/ConfidenceMeter.js'
import { RapportLayout } from '../components/RapportLayout.js'

interface ArticleRow {
  id: string
  title: string
  content: string
  body_md: string
  category: string
  tags_json: string[] | null
  status: 'draft' | 'published' | 'archived'
  embedding_status: string
  version: number
  created_at: string
  updated_at: string | null
}

const CATEGORIES = [
  'All',
  'Billing',
  'Auth',
  'API',
  'Onboarding',
  'Integrations',
  'general',
] as const

function snippetOf(article: ArticleRow): string {
  const text = (article.content || article.body_md || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > 160 ? `${text.slice(0, 157)}…` : text
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

function KnowledgeBase() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')

  async function loadArticles() {
    setLoading(true)
    setError(null)
    try {
      const response = await get<ArticleRow[]>('/api/knowledge')
      const rows = Array.isArray(response.data) ? response.data : []
      setArticles(rows)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('knowledgeBase.loadError', {}, { defaultValue: 'Failed to load articles' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadArticles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync search query to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (search) params.set('q', search)
    else params.delete('q')
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (category !== 'All' && a.category !== category) return false
      if (
        search &&
        !`${a.title} ${a.content} ${a.body_md}`.toLowerCase().includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [articles, category, search])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const response = await post<{ id?: string }>('/api/knowledge', {
        title: newTitle,
        content: newContent,
        body_md: newContent,
        category: newCategory,
        tags: [],
        status: 'published',
      })
      track({
        name: 'knowledge.article_created',
        properties: { article_id: response.data?.id, category: newCategory },
      })
      setShowNew(false)
      setNewTitle('')
      setNewContent('')
      setNewCategory('general')
      await loadArticles()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('knowledgeBase.createError', {}, { defaultValue: 'Failed to create article' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <RapportLayout>
      <div
        data-mol-id="page-knowledge-base"
        className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'flex-wrap gap-4')}>
          <div>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-4xl tracking-tight text-on-background leading-tight',
              )}
            >
              {t('knowledgeBase.title', {}, { defaultValue: 'Knowledge that compounds.' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
              {t(
                'knowledgeBase.subtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    "Articles power {{appName}}'s answers. Create, edit, and refine the content your bot draws from.",
                },
              )}
            </p>
          </div>
          <button
            data-mol-id="knowledge-new"
            type="button"
            onClick={() => setShowNew((s) => !s)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.touchTargetCompact,
              'rounded-full bg-primary text-on-primary px-4 py-2 hover:scale-[1.02] transition-transform',
            )}
          >
            <span className="material-symbols-outlined text-base">add</span>
            {t('knowledgeBase.newButton', {}, { defaultValue: 'New article' })}
          </button>
        </div>
      </div>

      {showNew && (
        <form
          data-mol-id="knowledge-new-form"
          onSubmit={handleCreate}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 3 }),
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest shadow-sm',
          )}
        >
          <input
            data-mol-id="knowledge-new-title"
            placeholder={t(
              'knowledgeBase.newTitlePlaceholder',
              {},
              { defaultValue: 'Article title' },
            )}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('base'),
              'rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
            )}
          />
          <textarea
            data-mol-id="knowledge-new-content"
            placeholder={t(
              'knowledgeBase.newContentPlaceholder',
              {},
              { defaultValue: 'Write the article body…' },
            )}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            required
            rows={6}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none resize-none',
            )}
          />
          <select
            data-mol-id="knowledge-new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.maxW('[200px]'),
              'rounded-xl bg-surface-container-low border-transparent focus:ring-2 focus:ring-primary/30 outline-none',
            )}
          >
            {CATEGORIES.filter((c) => c !== 'All').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className={cm.flex({ gap: 2 })}>
            <button
              data-mol-id="knowledge-new-submit"
              type="submit"
              disabled={creating || !newTitle || !newContent}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary px-5 py-2 disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('knowledgeBase.publishCta', {}, { defaultValue: 'Publish article' })}
            </button>
            <button
              data-mol-id="knowledge-new-cancel"
              type="button"
              onClick={() => setShowNew(false)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-surface-container-low text-on-surface px-5 py-2',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 4 }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm',
        )}
      >
        <form
          data-mol-id="knowledge-search-form"
          onSubmit={(e) => {
            e.preventDefault()
          }}
          className="relative"
        >
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
            search
          </span>
          <input
            data-mol-id="knowledge-search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'knowledgeBase.searchPlaceholder',
              {},
              { defaultValue: 'Search articles…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 12),
              cm.sp('pr', 4),
              cm.sp('py', 3),
              cm.textSize('base'),
              'rounded-xl bg-surface-container-low focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
        </form>
        <div className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')} data-mol-id="knowledge-categories">
          {CATEGORIES.map((c) => {
            const active = c === category
            return (
              <button
                key={c}
                data-mol-id={`knowledge-category-${c.toLowerCase()}`}
                type="button"
                onClick={() => setCategory(c)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full px-4 py-1.5 transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {c === 'All' ? t('status.all', {}, { defaultValue: 'All' }) : c}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div
          data-mol-id="knowledge-loading"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('knowledgeBase.loading', {}, { defaultValue: 'Loading articles…' })}
        </div>
      ) : error ? (
        <div
          data-mol-id="knowledge-error"
          role="alert"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-error')}
        >
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-mol-id="knowledge-empty"
          className={cm.cn(
            cm.textCenter,
            cm.sp('p', 12),
            cm.flex({ direction: 'col', gap: 3 }),
            'text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/50">
            menu_book
          </span>
          <span>
            {t(
              'knowledgeBase.empty',
              {},
              { defaultValue: 'No knowledge articles yet — create your first one!' },
            )}
          </span>
        </div>
      ) : (
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-3')}
          data-mol-id="knowledge-grid"
        >
          {filtered.map((article) => (
            <Link
              key={article.id}
              data-mol-id={`knowledge-card-${article.id}`}
              to={`/knowledge/${article.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 4 }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-md transition-all',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] tracking-widest uppercase',
                  )}
                >
                  {article.category}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {relativeTime(article.updated_at ?? article.created_at)}
                </span>
              </div>
              <h3
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'text-on-surface tracking-tight leading-snug',
                )}
              >
                {article.title}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant leading-relaxed line-clamp-3',
                )}
              >
                {snippetOf(article) ||
                  t('knowledgeBase.noBody', {}, { defaultValue: 'No content yet.' })}
              </p>
              <ConfidenceMeter
                value={article.embedding_status === 'ready' ? 0.9 : 0.5}
                label={t('knowledgeBase.confidenceLabel', {}, { defaultValue: 'Indexing' })}
              />
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    'rounded-full px-2 py-0.5',
                    article.status === 'published'
                      ? 'bg-[color-mix(in_srgb,var(--color-status-resolved-accent)_10%,transparent)] text-[var(--color-status-resolved-accent)]'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {article.status}
                </span>
                <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                  <span className="material-symbols-outlined text-base">arrow_outward</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </RapportLayout>
  )
}

export default KnowledgeBase
export { KnowledgeBase, KnowledgeBase as KnowledgeBasePage }
