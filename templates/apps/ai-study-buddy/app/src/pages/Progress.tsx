import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MasteryRing } from '../components/MasteryRing.js'
import { PageBody, PageHeader } from '../components/PageHeader.js'
import { StatCard } from '../components/StatCard.js'
import { StreakBadge } from '../components/StreakBadge.js'

interface ProgressPayload {
  weekly: Array<{ day: string; minutes: number }>
  kpis: {
    week_minutes: number
    avg_mastery: number
    recall_rate: number
    streak_days: number
  }
  overall_mastery: number
  subject_trends: Array<{
    id: string
    name: string
    mastery: number
    delta: number
    tone: 'success' | 'warning'
  }>
}

export function Progress() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<ProgressPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ProgressPayload>('/api/progress')
      .then((res) => {
        if (cancelled) return
        setData(res.data ?? null)
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('progress.error', {}, { defaultValue: 'Could not load progress.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const weekly = data?.weekly ?? []
  const peak = weekly.length > 0 ? Math.max(...weekly.map((d) => d.minutes), 1) : 1
  const totalMinutes = weekly.reduce((s, d) => s + d.minutes, 0)
  const kpis = data?.kpis
  const trends = data?.subject_trends ?? []

  return (
    <div
      data-mol-id="page-progress"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('progress.eyebrow', {}, { defaultValue: 'Insights' })}
        title={t('progress.title', {}, { defaultValue: 'Your learning trajectory' })}
        subtitle={t(
          'progress.subtitle',
          {},
          { defaultValue: "Where you've been, what to revisit, and the next mountain." },
        )}
        actions={
          kpis ? <StreakBadge days={kpis.streak_days} active={kpis.streak_days > 0} /> : null
        }
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {data === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('progress.loading', {}, { defaultValue: 'Loading progress…' })}
          </p>
        ) : (
          <>
            <section className={'grid grid-cols-1 gap-4 md:grid-cols-4'}>
              <StatCard
                tone="primary"
                icon="schedule"
                label={t('status.thisWeek', {}, { defaultValue: 'This week' })}
                value={`${(totalMinutes / 60).toFixed(1)}h`}
              />
              <StatCard
                tone="success"
                icon="trending_up"
                label={t('progress.kpi.mastery', {}, { defaultValue: 'Avg. mastery' })}
                value={`${kpis?.avg_mastery ?? 0}%`}
              />
              <StatCard
                tone="info"
                icon="psychology"
                label={t('progress.kpi.recall', {}, { defaultValue: 'Recall rate' })}
                value={`${kpis?.recall_rate ?? 0}%`}
              />
              <StatCard
                tone="primary"
                icon="emoji_events"
                label={t('progress.kpi.streak', {}, { defaultValue: 'Streak' })}
                value={t(
                  'progress.kpi.streakValue',
                  { count: kpis?.streak_days ?? 0 },
                  { defaultValue: '{{count}} days' },
                )}
              />
            </section>

            <section
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-ambient',
              )}
            >
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}
              >
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-primary mb-1',
                    )}
                  >
                    {t('progress.chart.label', {}, { defaultValue: 'Weekly minutes' })}
                  </p>
                  <h2
                    className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {t(
                      'progress.chart.title',
                      {},
                      { defaultValue: 'Your study minutes — last 7 days' },
                    )}
                  </h2>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t('progress.chart.peak', { peak }, { defaultValue: 'Peak: {{peak}}m' })}
                </span>
              </div>
              {weekly.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}
                >
                  {t(
                    'progress.chart.empty',
                    {},
                    {
                      defaultValue: 'No study activity yet — your first session will show up here.',
                    },
                  )}
                </p>
              ) : (
                <div className={'grid grid-cols-7 items-end gap-3 h-48'}>
                  {weekly.map((d) => {
                    const ratio = d.minutes / peak
                    return (
                      <div
                        key={d.day}
                        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}
                      >
                        <div className={'w-full flex-1 flex items-end'}>
                          <div
                            className={
                              'w-full rounded-xl bg-gradient-to-t from-primary to-inverse-primary transition-all hover:opacity-80'
                            }
                            style={{ height: `${Math.max(ratio * 100, 8)}%` }}
                          />
                        </div>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'text-on-surface-variant uppercase tracking-wider',
                          )}
                        >
                          {d.day}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'tabular-nums text-on-surface-variant/70',
                          )}
                        >
                          {d.minutes}m
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className={'grid gap-6 lg:grid-cols-[280px_1fr]'}>
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col items-center justify-center',
                )}
              >
                <MasteryRing
                  mastered={data?.overall_mastery ?? 0}
                  reviewing={Math.max(0, 100 - (data?.overall_mastery ?? 0))}
                  learning={0}
                  notStarted={0}
                  size={200}
                />
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'mt-4 uppercase tracking-widest text-primary',
                  )}
                >
                  {t('progress.overall', {}, { defaultValue: 'Overall' })}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col gap-3',
                )}
              >
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('progress.subjects', {}, { defaultValue: 'Subject trends (last 30 days)' })}
                </h3>
                {trends.length === 0 ? (
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'serif-text italic text-on-surface-variant',
                    )}
                  >
                    {t(
                      'progress.trends.empty',
                      {},
                      { defaultValue: 'Add courses to see subject-level trends.' },
                    )}
                  </p>
                ) : (
                  <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                    {trends.map((s) => (
                      <li key={s.id}>
                        <div
                          className={cm.cn(
                            cm.flex({ justify: 'between', align: 'center' }),
                            cm.sp('mb', 1),
                          )}
                        >
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'text-on-surface',
                            )}
                          >
                            {s.name}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'tabular-nums',
                              s.tone === 'success' ? 'text-success' : 'text-warning',
                            )}
                          >
                            {s.mastery}% · {s.delta >= 0 ? '+' : ''}
                            {s.delta}
                          </span>
                        </div>
                        <div
                          className={
                            'h-2 w-full overflow-hidden rounded-full bg-surface-container-highest'
                          }
                        >
                          <div
                            className={
                              'h-full rounded-full bg-gradient-to-r from-primary to-inverse-primary'
                            }
                            style={{ width: `${s.mastery}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </PageBody>
    </div>
  )
}
