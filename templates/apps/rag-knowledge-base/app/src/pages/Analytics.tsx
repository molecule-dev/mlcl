import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EngramHeroCard } from '../components/EngramHeroCard.js'
import { EngramMetricTile } from '../components/EngramMetricTile.js'
import { RelevancePill } from '../components/RelevancePill.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface TopDoc {
  id: string
  title: string
  citation_count: number
  avg_relevance: number
}

interface TopQuery {
  id: string
  question: string
  count: number
  avg_relevance: number
}

interface AnalyticsRecord {
  questions_today: number
  questions_change_pct: number
  avg_relevance_pct: number
  history_7d: Array<{ date: string; count: number }>
  total_queries_30d: number
  unique_askers_30d: number
  unanswered_count: number
  avg_response_ms: number
  top_docs: TopDoc[]
  top_queries: TopQuery[]
}

const EMPTY: AnalyticsRecord = {
  questions_today: 0,
  questions_change_pct: 0,
  avg_relevance_pct: 0,
  history_7d: [],
  total_queries_30d: 0,
  unique_askers_30d: 0,
  unanswered_count: 0,
  avg_response_ms: 0,
  top_docs: [],
  top_queries: [],
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<AnalyticsRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    http
      .get('/api/reports/analytics')
      .then((res) => {
        if (cancelled) return
        const fetched = unwrapSingle<AnalyticsRecord>(res)
        setData(fetched ?? EMPTY)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('analytics.error', {}, { defaultValue: 'Could not load analytics.' }),
        )
        setData(EMPTY)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (data === null) {
    return (
      <p
        data-testid="analytics-loading"
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('analytics.loading', {}, { defaultValue: 'Loading analytics\u2026' })}
      </p>
    )
  }

  const view = data
  const queriesPerAsker = view.total_queries_30d / Math.max(1, view.unique_askers_30d)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('analytics.heading', {}, { defaultValue: 'Retrieval analytics' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'analytics.subheading',
            {},
            {
              defaultValue:
                'Top cited docs, recurring questions, and where retrieval is letting your team down.',
            },
          )}
        </p>
        {error ? (
          <p
            data-testid="analytics-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <EngramHeroCard
          questionsAnswered={view.questions_today}
          changePercent={view.questions_change_pct}
          avgRelevance={view.avg_relevance_pct}
          history={view.history_7d}
        />
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:col-span-4')}>
          <EngramMetricTile
            label={t('analytics.metric.totalQueries', {}, { defaultValue: 'Total queries' })}
            value={view.total_queries_30d.toLocaleString()}
            icon="forum"
            tone="primary"
          />
          <EngramMetricTile
            label={t('analytics.metric.uniqueAskers', {}, { defaultValue: 'Unique askers' })}
            value={view.unique_askers_30d.toLocaleString()}
            icon="group"
            tone="cited"
          />
        </div>
      </section>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <EngramMetricTile
          label={t('analytics.metric.relevance', {}, { defaultValue: 'Avg relevance' })}
          value={`${view.avg_relevance_pct.toFixed(1)}%`}
          icon="verified"
          tone="success"
          meter={view.avg_relevance_pct}
        />
        <EngramMetricTile
          label={t('analytics.metric.latency', {}, { defaultValue: 'P50 latency' })}
          value={`${view.avg_response_ms} ms`}
          icon="bolt"
          tone="info"
        />
        <EngramMetricTile
          label={t('analytics.metric.unanswered', {}, { defaultValue: 'Unanswered' })}
          value={view.unanswered_count.toLocaleString()}
          icon="search_off"
          tone="warning"
          caption={t(
            'analytics.metric.unansweredCaption',
            {},
            { defaultValue: 'Below relevance threshold' },
          )}
        />
        <EngramMetricTile
          label={t('analytics.metric.queriesPerAsker', {}, { defaultValue: 'Queries / asker' })}
          value={queriesPerAsker.toFixed(1)}
          icon="leaderboard"
          tone="accent"
        />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
              {t('analytics.topDocs.heading', {}, { defaultValue: 'Top cited documents' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('analytics.last30Days', {}, { defaultValue: '30 days' })}
            </span>
          </div>
          {view.top_docs.length === 0 ? (
            <p
              data-testid="analytics-topdocs-empty"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t(
                'analytics.topDocs.empty',
                {},
                {
                  defaultValue:
                    'No citations yet \u2014 ask your first question to populate this list.',
                },
              )}
            </p>
          ) : (
            <ol
              data-testid="analytics-topdocs"
              className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
            >
              {view.top_docs.map((d, i) => (
                <li key={d.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      'tabular-nums font-bold rounded-full text-on-primary-container bg-primary-container shrink-0',
                    )}
                    style={{ width: 24, height: 24 }}
                  >
                    {i + 1}
                  </span>
                  <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'font-semibold text-on-surface line-clamp-1',
                      )}
                    >
                      {d.title}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                      {t(
                        'analytics.topDocs.citations',
                        { count: d.citation_count },
                        { defaultValue: `${d.citation_count} citations` },
                      )}
                    </p>
                  </div>
                  <RelevancePill value={d.avg_relevance} />
                </li>
              ))}
            </ol>
          )}
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
              {t('analytics.topQueries.heading', {}, { defaultValue: 'Most asked questions' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('analytics.last30Days', {}, { defaultValue: '30 days' })}
            </span>
          </div>
          {view.top_queries.length === 0 ? (
            <p
              data-testid="analytics-topqueries-empty"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t(
                'analytics.topQueries.empty',
                {},
                { defaultValue: 'No questions asked in the last 30 days.' },
              )}
            </p>
          ) : (
            <ol
              data-testid="analytics-topqueries"
              className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
            >
              {view.top_queries.map((q, i) => (
                <li key={q.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      'tabular-nums font-bold rounded-full text-on-primary-container bg-primary-container shrink-0',
                    )}
                    style={{ width: 24, height: 24 }}
                  >
                    {i + 1}
                  </span>
                  <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'font-semibold text-on-surface line-clamp-1',
                      )}
                    >
                      {q.question}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                      {t(
                        'analytics.topQueries.askedTimes',
                        { count: q.count },
                        { defaultValue: `${q.count} times asked` },
                      )}
                    </p>
                  </div>
                  <RelevancePill value={q.avg_relevance} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
