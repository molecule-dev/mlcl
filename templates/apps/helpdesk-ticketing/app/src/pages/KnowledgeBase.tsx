// Phase 1 baseline — verbatim JSX of design-helpdesk-ticketing-knowledge-base.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AppShell from '../components/AppShell.js'
import FloatingHelpButton from '../components/FloatingHelpButton.js'
import KnowledgeArticleItem from '../components/KnowledgeArticleItem.js'
import KnowledgeCategoriesHeader from '../components/KnowledgeCategoriesHeader.js'
import KnowledgeCategoryCard from '../components/KnowledgeCategoryCard.js'
import KnowledgeHeroSearch from '../components/KnowledgeHeroSearch.js'
import KnowledgeRecentArticlesHeader from '../components/KnowledgeRecentArticlesHeader.js'
import KnowledgeTopNavBar from '../components/KnowledgeTopNavBar.js'

interface Article {
  id: string
  title: string
  body?: string
  category?: string
  tag?: string
  created_at?: string
  updated_at?: string
  views?: number
}

function KnowledgeBase() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'updated'>('all')

  useEffect(() => {
    let active = true
    http
      .get<Article[] | { data: Article[] }>('/api/articles')
      .then((res) => {
        if (!active) return
        const body = res.data
        setArticles(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [])
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : t('knowledgeBase.loadError', {}, { defaultValue: 'Failed to load articles' }),
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [http, t])

  const filtered = (() => {
    let result = articles
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) => a.title?.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q),
      )
    }
    if (activeFilter === 'updated') {
      result = [...result].sort(
        (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
      )
    }
    return result
  })()

  return (
    <AppShell topBar={<KnowledgeTopNavBar />} contentMolId="main-canvas">
      {/* Main Content Canvas */}
      <div
        className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('py', 12), cm.stack(10), 'px-4 md:px-10')}
        data-mol-id="main-container"
      >
        {/* Hero Search Section */}
        <KnowledgeHeroSearch search={search} onSearchChange={setSearch} />
        {/* Category Cards (Asymmetric Bento Grid Inspired) */}
        <section className={cm.stack(6)} data-mol-id="categories-section">
          <KnowledgeCategoriesHeader />
          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 10 }), 'md:grid-cols-2 lg:grid-cols-4')}
            data-mol-id="category-grid"
          >
            {/* Getting Started */}
            <KnowledgeCategoryCard
              variant="getting-started"
              onClick={() => navigate('/knowledge-base/category/getting-started')}
            />
            {/* Account & Billing */}
            <KnowledgeCategoryCard
              variant="account-billing"
              onClick={() => navigate('/knowledge-base/category/account-billing')}
            />
            {/* API & Integrations */}
            <KnowledgeCategoryCard
              variant="api-integrations"
              onClick={() => navigate('/knowledge-base/category/api-integrations')}
            />
            {/* Troubleshooting */}
            <KnowledgeCategoryCard
              variant="troubleshooting"
              onClick={() => navigate('/knowledge-base/category/troubleshooting')}
            />
          </div>
        </section>
        {/* Recent Articles Table-less Layout */}
        <section className={cm.stack(6)} data-mol-id="recent-articles-section">
          <KnowledgeRecentArticlesHeader
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          <div className={cm.stack(4)} data-mol-id="articles-list">
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    aria-hidden="true"
                    className={cm.cn(
                      cm.h(20),
                      'rounded-2xl bg-surface-container-low animate-pulse',
                    )}
                  />
                ))}
              </>
            ) : error ? (
              <p role="alert" className={cm.cn(cm.textSize('sm'), cm.sp('p', 4), 'text-error')}>
                {error}
              </p>
            ) : filtered.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), cm.sp('p', 4), 'text-on-surface-variant')}>
                {t('knowledgeBase.noResults', {}, { defaultValue: 'No articles found.' })}
              </p>
            ) : (
              filtered.map((article, i) => (
                <KnowledgeArticleItem
                  key={article.id}
                  article={{
                    ...article,
                    views: article.views ?? 820 + ((i * 137 + article.id.length * 11) % 2400),
                  }}
                />
              ))
            )}
          </div>
        </section>
      </div>
      {/* Floating Help Button (Contextual Support) */}
      <FloatingHelpButton />
    </AppShell>
  )
}

export default KnowledgeBase
export { KnowledgeBase, KnowledgeBase as KnowledgeBasePage }
