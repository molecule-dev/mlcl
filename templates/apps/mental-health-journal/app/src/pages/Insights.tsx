import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MoodTrendChart } from '../components/MoodTrendChart.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface InsightsData {
  mood_trend: { date: string; score: number }[]
  top_themes: { tag: string; count: number; sentiment: 'positive' | 'neutral' | 'negative' }[]
  triggers: { trigger: string; frequency: number; mood_delta: number }[]
  ai_summary: string
  ai_summary_generated_at: string
}

const SENTIMENT_COLORS: Record<InsightsData['top_themes'][number]['sentiment'], string> = {
  positive: 'rgba(16, 185, 129, 0.18)',
  neutral: 'rgba(245, 158, 11, 0.18)',
  negative: 'rgba(239, 68, 68, 0.18)',
}

export function Insights() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/journal/insights')
      .then((res) => {
        if (cancelled) return
        const d = unwrapSingle<InsightsData>(res)
        if (d && Array.isArray((d as InsightsData).mood_trend)) setData(d)
        else setError(t('insights.loadError', {}, { defaultValue: 'Could not load insights.' }))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('insights.loadError', {}, { defaultValue: 'Could not load insights.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const maxThemeCount = data ? Math.max(1, ...data.top_themes.map((theme) => theme.count)) : 1

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('insights.eyebrow', {}, { defaultValue: 'Quiet patterns' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('insights.heading', {}, { defaultValue: 'Insights' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'insights.subheading',
            {},
            {
              defaultValue:
                'Mood patterns, themes, and triggers — gathered gently from your last 30 days.',
            },
          )}
        </p>
      </header>

      {loading && !data ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : null}
      {error && !data ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')} role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <MoodTrendChart points={data.mood_trend} />

          <section
            className={cm.cn(cm.sp('p', 8), 'rounded-2xl text-white relative overflow-hidden')}
            style={{
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-surface/15 blur-3xl pointer-events-none',
              )}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('mb', 3),
                'relative z-10',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                auto_awesome
              </span>
              <span
                className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-widest')}
              >
                {t('insights.aiSummaryLabel', {}, { defaultValue: 'AI reflection' })}
              </span>
            </div>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('semibold'),
                'italic relative z-10',
                cm.maxW('2xl'),
              )}
            >
              “{data.ai_summary}”
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 4),
                'text-white/75 relative z-10 uppercase tracking-widest font-bold',
              )}
            >
              {t(
                'insights.aiGeneratedAt',
                { date: new Date(data.ai_summary_generated_at).toLocaleDateString() },
                { defaultValue: 'Refreshed {{date}}' },
              )}
            </p>
          </section>

          <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
              )}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('insights.themesHeading', {}, { defaultValue: 'Top themes' })}
              </h3>
              <ul className={cm.cn('space-y-3')}>
                {data.top_themes.map((theme) => (
                  <li key={theme.tag} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.fontWeight('semibold'),
                        'rounded-full text-[11px] py-0.5 shrink-0',
                      )}
                      style={{
                        backgroundColor: SENTIMENT_COLORS[theme.sentiment],
                        color: 'var(--mol-color-primary)',
                      }}
                    >
                      #{theme.tag}
                    </span>
                    <div
                      className={cm.cn(
                        cm.flex1,
                        'h-2 rounded-full bg-surface-container relative overflow-hidden',
                      )}
                    >
                      <div
                        className={cm.cn('absolute inset-y-0 left-0 rounded-full')}
                        style={{
                          width: `${(theme.count / maxThemeCount) * 100}%`,
                          background:
                            'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                        }}
                      />
                    </div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('extrabold'),
                        cm.textSize('sm'),
                        'tabular-nums shrink-0 w-8 text-right text-on-surface',
                      )}
                    >
                      {theme.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
              )}
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'insights.triggersHeading',
                  {},
                  { defaultValue: 'Patterns that move your mood' },
                )}
              </h3>
              <ul className={cm.cn('space-y-2')}>
                {data.triggers.map((trigger) => {
                  const positive = trigger.mood_delta >= 0
                  return (
                    <li
                      key={trigger.trigger}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        cm.sp('p', 3),
                        'rounded-xl bg-surface-container',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <span
                          className={cm.cn('material-symbols-outlined text-2xl shrink-0')}
                          aria-hidden="true"
                          style={{
                            color: positive ? 'var(--color-success)' : 'var(--color-error)',
                            fontVariationSettings: "'FILL' 1",
                          }}
                        >
                          {positive ? 'trending_up' : 'trending_down'}
                        </span>
                        <div>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('bold'),
                              'text-on-surface',
                            )}
                          >
                            {trigger.trigger}
                          </p>
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {t(
                              'insights.triggerFrequency',
                              { count: trigger.frequency },
                              { defaultValue: 'noticed {{count}}× this month' },
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cm.cn('text-lg font-extrabold tracking-tight tabular-nums')}
                        style={{ color: positive ? 'var(--color-success)' : 'var(--color-error)' }}
                      >
                        {positive ? '+' : ''}
                        {(trigger.mood_delta * 100).toFixed(0)}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
