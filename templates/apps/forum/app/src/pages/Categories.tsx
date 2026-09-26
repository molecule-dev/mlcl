/**
 * Categories — /categories grid of all communities.
 *
 * Layout: filter tabs → grid of CategoryCard (3-col on lg).
 *
 * Loads real categories from `GET /api/categories` (auto-seeded on
 * first hit by the API). The filter pills work client-side:
 * "Subscribed" matches the user's category bookmarks (the same
 * bookmark rows CategoryDetail's Subscribe button writes), "Trending"
 * sorts by member/thread counts, "New" sorts by creation date.
 */
import { useEffect, useMemo, useState } from 'react'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CategoryCard, type CategoryCardData } from '../components/CategoryCard.js'

const FILTERS = [
  { id: 'all', labelKey: 'categories.filterAll', defaultLabel: 'All' },
  { id: 'subscribed', labelKey: 'categories.filterSubscribed', defaultLabel: 'Subscribed' },
  { id: 'trending', labelKey: 'categories.filterTrending', defaultLabel: 'Trending' },
  { id: 'new', labelKey: 'categories.filterNew', defaultLabel: 'New' },
] as const

interface ApiCategory {
  id: string
  slug: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  thread_count?: number | null
  subscriber_count?: number | null
  created_at: string
}

function isLikelyEmoji(value: string | null | undefined): boolean {
  if (!value) return false
  return /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}]/u.test(value)
}

function toCardData(api: ApiCategory): CategoryCardData {
  const isEmoji = isLikelyEmoji(api.icon)
  return {
    slug: api.slug,
    name: api.name,
    description: api.description ?? '',
    emoji: isEmoji ? (api.icon ?? undefined) : undefined,
    icon: isEmoji ? undefined : (api.icon ?? undefined),
    subscribers: api.subscriber_count ?? 0,
    activeNow: undefined,
    accentColor: api.color ?? undefined,
  }
}

export function Categories() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [active, setActive] = useState<(typeof FILTERS)[number]['id']>('all')
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [subscribedIds, setSubscribedIds] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const http = getHttpClient()
        const res = await http.get<ApiCategory[]>('/api/categories')
        if (!mounted) return
        setCategories(res.data ?? [])
      } catch (error) {
        logError('categories.load', error)
        if (!mounted) return
        setError(t('categories.loadError', {}, { defaultValue: 'Could not load communities.' }))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    // Load the user's category subscriptions (bookmark rows with
    // resourceType="category" — the same rows CategoryDetail toggles).
    void (async () => {
      try {
        const http = getHttpClient()
        const res = await http.get<{ data?: Array<{ resourceId: string }> }>(
          '/api/bookmarks?resourceType=category&limit=100',
        )
        if (!mounted) return
        setSubscribedIds(new Set((res.data?.data ?? []).map((b) => b.resourceId)))
      } catch (error) {
        // Non-fatal: the "Subscribed" filter simply shows an empty state.
        logError('categories.loadSubscriptions', error)
      }
    })()
    return () => {
      mounted = false
    }
  }, [t])

  const visible = useMemo(() => {
    if (active === 'subscribed') return categories.filter((c) => subscribedIds.has(c.id))
    if (active === 'trending') {
      return [...categories].sort(
        (a, b) =>
          (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0) ||
          (b.thread_count ?? 0) - (a.thread_count ?? 0),
      )
    }
    if (active === 'new') {
      return [...categories].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    }
    return categories
  }, [categories, subscribedIds, active])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('categories.eyebrow', {}, { defaultValue: 'Communities' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('categories.title', {}, { defaultValue: 'Find your room' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'categories.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                'Browse {{appName}} communities by activity, subject, and how loud they are. Subscribe to add a feed to your home.',
            },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((filter) => {
          const isActive = filter.id === active
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActive(filter.id)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
              )}
            >
              {t(filter.labelKey, {}, { defaultValue: filter.defaultLabel })}
            </button>
          )
        })}
      </div>

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('categories.loading', {}, { defaultValue: 'Loading communities…' })}
        </p>
      )}
      {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
            cm.sp('p', 8),
            'rounded-lg border border-dashed border-outline-variant/60 text-on-surface-variant text-center',
          )}
        >
          <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {active === 'subscribed'
              ? t(
                  'categories.emptySubscribed',
                  {},
                  { defaultValue: 'You have not subscribed to any communities yet.' },
                )
              : t('categories.emptyFilter', {}, { defaultValue: 'No communities to show.' })}
          </p>
          {active === 'subscribed' && (
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'categories.emptySubscribedHint',
                {},
                { defaultValue: 'Open a community and hit Subscribe to add it here.' },
              )}
            </p>
          )}
        </div>
      )}
      {!loading && !error && (
        <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {visible.map((c) => (
            <CategoryCard key={c.slug} category={toCardData(c)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Categories
