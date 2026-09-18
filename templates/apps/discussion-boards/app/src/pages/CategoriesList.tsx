import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CategoryCard } from '../components/CategoryCard.js'
import { ForumHeroCard } from '../components/ForumHeroCard.js'

interface Category {
  id: string
  slug: string
  name: string
  description: string
  icon?: string
  color?: string
  thread_count: number
  post_count: number
  last_activity_at?: string
  last_thread_title?: string
  status?: 'live' | 'pinned' | 'archived'
}

export function CategoriesList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data: Category[] } | Category[]>('/api/categories-rich')
      .then((res) => {
        if (cancelled) return
        const body = res?.data as unknown
        const list = Array.isArray(body)
          ? (body as Category[])
          : Array.isArray((body as { data?: Category[] })?.data)
            ? (body as { data: Category[] }).data
            : []
        setCategories(list)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setCategories([])
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const list = categories ?? []
  const totalThreads = list.reduce((sum, c) => sum + (c.thread_count ?? 0), 0)
  const totalPosts = list.reduce((sum, c) => sum + (c.post_count ?? 0), 0)
  const liveCount = list.filter((c) => c.status !== 'archived').length

  return (
    <div className={cm.cn(cm.stack(8))}>
      <ForumHeroCard
        eyebrow={t('categoriesList.hero.eyebrow', {}, { defaultValue: 'The agora' })}
        title={t('categoriesList.hero.title', {}, { defaultValue: 'Pick a room. Bring an idea.' })}
        subtitle={t(
          'categoriesList.hero.subtitle',
          {},
          {
            defaultValue:
              'Each category sets its own etiquette. Browse the live ones, skim the archive, or start a new thread anywhere.',
          },
        )}
        primaryCta={{
          label: t('categoriesList.hero.composeCta', {}, { defaultValue: 'Start a thread' }),
          to: '/compose',
        }}
        secondaryCta={{
          label: t('categoriesList.hero.searchCta', {}, { defaultValue: 'Search the archive' }),
          to: '/search',
        }}
        stats={[
          {
            labelKey: 'categoriesList.hero.stat.live',
            defaultLabel: 'Live rooms',
            value: liveCount.toString(),
          },
          {
            labelKey: 'categoriesList.hero.stat.threads',
            defaultLabel: 'Threads',
            value: totalThreads.toLocaleString(),
          },
          {
            labelKey: 'categoriesList.hero.stat.posts',
            defaultLabel: 'Posts',
            value: totalPosts.toLocaleString(),
          },
        ]}
      />

      <section className={cm.cn(cm.stack(4))}>
        <div
          className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'sm' }), 'flex-wrap')}
        >
          <div className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-[0.3em] text-primary',
              )}
            >
              {t('categoriesList.list.eyebrow', {}, { defaultValue: 'All categories' })}
            </span>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'categoriesList.list.title',
                {},
                { defaultValue: 'Where the conversation lives.' },
              )}
            </h2>
          </div>
          {error && (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>{error}</p>
          )}
        </div>
        {categories === null ? (
          <p className={cm.textMuted}>
            {t('categoriesList.loading', {}, { defaultValue: 'Loading categories…' })}
          </p>
        ) : list.length === 0 ? (
          <p className={cm.textMuted}>
            {t(
              'categoriesList.empty',
              {},
              { defaultValue: 'No categories yet. Be the first to start one.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'xl:grid-cols-2')}>
            {list.map((category) => (
              <CategoryCard
                key={category.id}
                slug={category.slug}
                name={category.name}
                description={category.description}
                icon={category.icon}
                color={category.color}
                threadCount={category.thread_count}
                postCount={category.post_count}
                lastActivityAt={category.last_activity_at}
                lastThreadTitle={category.last_thread_title}
                status={category.status}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default CategoriesList
