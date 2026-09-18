import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  type ApiPlan,
  type ApiSubscription,
  centsToLabel,
  unwrapList,
  unwrapSingle,
} from '../lib/api.js'

type BoxFilter = 'all' | 'available' | 'subscribed'

const filters: { id: BoxFilter; labelKey: string; labelDefault: string }[] = [
  { id: 'all', labelKey: 'boxes.filter.all', labelDefault: 'All editions' },
  { id: 'available', labelKey: 'boxes.filter.available', labelDefault: 'Available' },
  { id: 'subscribed', labelKey: 'boxes.filter.subscribed', labelDefault: 'My subscription' },
]

export function Boxes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<BoxFilter>('all')
  const [query, setQuery] = useState('')
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/plans').then(unwrapList<ApiPlan>),
      http
        .get('/api/subscriptions/mine')
        .then(unwrapSingle<ApiSubscription>)
        .catch(() => null),
    ])
      .then(([list, sub]) => {
        if (cancelled) return
        setPlans(list)
        setSubscription(sub)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return plans.filter((p) => {
      const isCurrent = subscription?.plan_id === p.id
      const matchesFilter =
        filter === 'all' ||
        (filter === 'available' && !isCurrent) ||
        (filter === 'subscribed' && isCurrent)
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [plans, filter, query, subscription])

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('py', 8))}
      data-testid="boxes-page"
    >
      <div
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
            {t('boxes.eyebrow', { appName: APP_NAME }, { defaultValue: 'The {{appName}} archive' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {t('boxes.heading', {}, { defaultValue: 'Browse every edition' })}
          </h1>
          <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
            {t(
              'boxes.subtitle',
              {},
              {
                defaultValue:
                  'Each tier is a small-batch story. Add one to your queue or swap it into your next month.',
              },
            )}
          </p>
        </div>
        <label
          aria-label={t('boxes.search.label', {}, { defaultValue: 'Search editions' })}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.roundedFull,
            'bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary transition-colors min-w-[280px]',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}>
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('boxes.search.placeholder', {}, { defaultValue: 'Search editions…' })}
            data-testid="boxes-search"
            className={cm.cn(
              'flex-1 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
            )}
          />
        </label>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            data-testid={`boxes-filter-${f.id}`}
            aria-pressed={filter === f.id}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-xs uppercase tracking-widest transition-all',
              filter === f.id
                ? 'bg-on-surface text-surface shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(f.labelKey, {}, { defaultValue: f.labelDefault })}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
          data-testid="boxes-loading"
        >
          {t('boxes.loading', {}, { defaultValue: 'Loading editions…' })}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('py', 16),
            cm.textCenter,
          )}
          data-testid="boxes-empty"
        >
          <span className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/60')}>
            inbox
          </span>
          <p className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface')}>
            {t('boxes.empty.title', {}, { defaultValue: 'No editions match.' })}
          </p>
          <p className={cm.textMuted}>
            {t(
              'boxes.empty.body',
              {},
              { defaultValue: 'Try a different filter or clear your search.' },
            )}
          </p>
        </div>
      ) : (
        <div
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          data-testid="boxes-grid"
        >
          {visible.map((p) => {
            const isCurrent = subscription?.plan_id === p.id
            return (
              <Link
                key={p.id}
                to={`/boxes/${p.id}`}
                data-testid={`box-card-${p.slug ?? p.id}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary transition-all',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
                  <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
                    {p.name}
                  </h2>
                  {isCurrent && (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'text-[10px] uppercase tracking-widest bg-primary/10 text-primary',
                      )}
                    >
                      {t('nav.current', {}, { defaultValue: 'Current' })}
                    </span>
                  )}
                </div>
                <p className={cm.cn('text-sm text-on-surface-variant line-clamp-3')}>
                  {p.description}
                </p>
                <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }), cm.sp('mt', 2))}>
                  <span className={cm.cn('text-3xl font-extrabold text-primary tabular-nums')}>
                    {centsToLabel(p.price, p.currency)}
                  </span>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {`/ ${p.interval}`}
                  </span>
                </div>
                <ul
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('mt', 2),
                    'text-sm text-on-surface-variant',
                  )}
                >
                  {p.features.slice(0, 3).map((f, i) => (
                    <li key={i} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
                      <span className={cm.cn('material-symbols-outlined text-base text-primary')}>
                        check_small
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <span className={cm.cn(cm.sp('mt', 2), 'text-xs font-bold text-primary')}>
                  {t('boxes.card.cta', {}, { defaultValue: 'View edition →' })}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Boxes
