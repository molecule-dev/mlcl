import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnalyticsStatTile } from '../components/AnalyticsStatTile.js'
import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'

interface Presentation {
  id: string
  title: string
  is_public: boolean
  slide_count: number
  created_at: string
  updated_at: string
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [decks, setDecks] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<Presentation[]>('/presentations')
      .then((res) => {
        if (cancelled) return
        setDecks(res.data)
      })
      .catch(() => {
        if (cancelled) return
        setDecks([])
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const stats = useMemo<Array<Parameters<typeof AnalyticsStatTile>[0]>>(() => {
    const totalSlides = decks.reduce((s, d) => s + (d.slide_count ?? 0), 0)
    const publicCount = decks.filter((d) => d.is_public).length
    const editedThisWeek = decks.filter(
      (d) => Date.now() - new Date(d.updated_at).getTime() < 7 * 24 * 60 * 60 * 1000,
    ).length
    return [
      {
        label: t('analytics.stats.decks', {}, { defaultValue: 'Total decks' })!,
        value: String(decks.length),
        eyebrow: t('analytics.stats.allTime', {}, { defaultValue: 'In your studio' })!,
        accentColor: '#7c3aed',
        iconName: 'co_present',
        sparkline: [0.2, 0.3, 0.28, 0.42, 0.36, 0.55, 0.5, 0.68, 0.72, 0.66, 0.78, 0.85, 0.9, 0.95],
      },
      {
        label: t('analytics.stats.slides', {}, { defaultValue: 'Total slides' })!,
        value: String(totalSlides),
        eyebrow: t('analytics.stats.acrossDecks', {}, { defaultValue: 'Across all decks' })!,
        accentColor: '#ec4899',
        iconName: 'filter_none',
        sparkline: [0.4, 0.42, 0.45, 0.41, 0.5, 0.48, 0.52, 0.55, 0.51, 0.58, 0.6, 0.62, 0.66, 0.7],
      },
      {
        label: t('analytics.stats.public', {}, { defaultValue: 'Public decks' })!,
        value: String(publicCount),
        eyebrow: t('analytics.stats.shareable', {}, { defaultValue: 'Currently shareable' })!,
        accentColor: '#06b6d4',
        iconName: 'public',
        sparkline: [
          0.7, 0.66, 0.72, 0.74, 0.68, 0.65, 0.7, 0.69, 0.66, 0.62, 0.66, 0.6, 0.62, 0.58,
        ],
      },
      {
        label: t('analytics.stats.recent', {}, { defaultValue: 'Edited this week' })!,
        value: String(editedThisWeek),
        eyebrow: t('analytics.stats.last7', {}, { defaultValue: 'Last 7 days' })!,
        accentColor: '#f59e0b',
        iconName: 'edit_note',
        sparkline: [0.1, 0.12, 0.18, 0.2, 0.22, 0.28, 0.32, 0.34, 0.4, 0.45, 0.52, 0.6, 0.68, 0.74],
      },
    ]
  }, [decks, t])

  const topDecks = useMemo(
    () =>
      [...decks]
        .sort((a, b) => b.slide_count - a.slide_count)
        .slice(0, 5)
        .map((d) => ({
          id: d.id,
          title: d.title || t('decks.untitled', {}, { defaultValue: 'Untitled deck' })!,
          slides: d.slide_count,
          updated: new Date(d.updated_at).toLocaleDateString(),
        })),
    [decks, t],
  )

  return (
    <PresentationBuilderLayout
      eyebrow={t('nav.analytics', {}, { defaultValue: 'Analytics' })!}
      title={t('analytics.title', {}, { defaultValue: 'Stage performance' })!}
    >
      <div className={cm.cn(cm.stack(8))}>
        <div data-testid="analytics-stats" className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
          {stats.map((s) => (
            <div key={s.label} className={cm.cn('col-span-12 sm:col-span-6 lg:col-span-3')}>
              <AnalyticsStatTile {...s} />
            </div>
          ))}
        </div>

        <article
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 6),
            cm.stack(4),
            'col-span-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
          )}
        >
          <div className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t('analytics.topDecks.eyebrow', {}, { defaultValue: 'Top decks' })}
            </span>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-on-surface tracking-tight',
              )}
            >
              {t('analytics.topDecks.title', {}, { defaultValue: 'Largest decks in your studio' })}
            </h2>
          </div>
          {loading ? (
            <div
              data-testid="analytics-loading"
              className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-center')}
            >
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </div>
          ) : topDecks.length === 0 ? (
            <div
              data-testid="analytics-empty"
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center' }),
                cm.sp('p', 8),
                cm.stack(2),
                'text-on-surface-variant',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[28px]')}>monitoring</span>
              <span>
                {t('analytics.empty', {}, { defaultValue: 'Create decks to see analytics here.' })}
              </span>
            </div>
          ) : (
            <table data-testid="analytics-top-table" className={cm.cn(cm.w('full'), 'text-left')}>
              <thead>
                <tr className={cm.cn('border-b border-outline-variant/30')}>
                  <th
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('analytics.topDecks.deck', {}, { defaultValue: 'Deck' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant text-right',
                    )}
                  >
                    {t('analytics.topDecks.slides', {}, { defaultValue: 'Slides' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant text-right',
                    )}
                  >
                    {t('analytics.topDecks.updated', {}, { defaultValue: 'Updated' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-surface-container')}>
                {topDecks.map((d) => (
                  <tr
                    key={d.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td
                      className={cm.cn(
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {d.title}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'text-on-surface tabular-nums text-right',
                      )}
                    >
                      {d.slides.toLocaleString()}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface-variant text-right',
                      )}
                    >
                      {d.updated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>
    </PresentationBuilderLayout>
  )
}

export default Analytics
