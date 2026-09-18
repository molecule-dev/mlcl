import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ViewPoint {
  date: string
  views: number
}

interface ViewsResponse {
  points?: ViewPoint[]
  totalViews?: number
}

const DAY_LABEL_KEYS: Record<number, { key: string; default: string }> = {
  0: { key: 'common.sunday', default: 'Sun' },
  1: { key: 'common.monday', default: 'Mon' },
  2: { key: 'common.tuesday', default: 'Tue' },
  3: { key: 'common.wednesday', default: 'Wed' },
  4: { key: 'common.thursday', default: 'Thu' },
  5: { key: 'common.friday', default: 'Fri' },
  6: { key: 'common.saturday', default: 'Sat' },
}

function buildPath(points: ViewPoint[], width: number, height: number): string {
  if (points.length === 0) return ''
  const max = Math.max(...points.map((p) => p.views), 1)
  const stepX = points.length === 1 ? 0 : width / (points.length - 1)
  return points
    .map((p, i) => {
      const x = stepX === 0 ? width / 2 : i * stepX
      const y = height - (p.views / max) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function buildAreaPath(points: ViewPoint[], width: number, height: number): string {
  if (points.length === 0) return ''
  const max = Math.max(...points.map((p) => p.views), 1)
  const stepX = points.length === 1 ? 0 : width / (points.length - 1)
  let d = ''
  points.forEach((p, i) => {
    const x = stepX === 0 ? width / 2 : i * stepX
    const y = height - (p.views / max) * height
    d += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)} `
  })
  d += `L${width},${height} L0,${height} Z`
  return d
}

function EngagementTrendsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [points, setPoints] = useState<ViewPoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ViewsResponse>('/api/analytics/views?days=7')
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        setPoints(payload?.points ?? [])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'engagementTrendsSection.fetchError',
                {},
                { defaultValue: 'Could not load engagement data.' },
              ),
        )
        setPoints([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalViews = useMemo(
    () => (points ?? []).reduce((sum, p) => sum + (Number(p.views) || 0), 0),
    [points],
  )

  const labels = useMemo(() => {
    if (!points || points.length === 0) return []
    return points.map((p) => {
      const date = new Date(p.date + 'T00:00:00Z')
      const dow = date.getUTCDay()
      const meta = DAY_LABEL_KEYS[dow] ?? { key: 'common.unknownDay', default: '—' }
      return t(meta.key, {}, { defaultValue: meta.default })
    })
  }, [points, t])

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        cm.stack(6),
        'bg-surface-container-lowest rounded-xl editorial-shadow',
      )}
      data-mol-id="engagement-trends"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
        <div>
          <h3 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-headline')}>
            {t('engagementTrendsSection.title', {}, { defaultValue: 'Engagement Trends' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-secondary')}>
            {t(
              'engagementTrendsSection.subtitleViews',
              { total: totalViews, days: 7 },
              { defaultValue: '{{total}} views over the last {{days}} days' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              cm.sp('px', 3),
              cm.roundedFull,
              'gap-1.5 py-1.5 bg-primary-fixed/30',
            )}
          >
            <div className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary')}></div>
            {t('engagementTrendsSection.views', {}, { defaultValue: 'Views' })}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(cm.sp('pt', 4), cm.h(64), cm.w('full'), 'relative')}
        data-mol-id="engagement-chart"
      >
        {points === null ? (
          <p
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'center' }),
              cm.h('full'),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'center' }),
              cm.h('full'),
              cm.textSize('sm'),
              'text-error',
            )}
          >
            {error}
          </p>
        ) : (
          <>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                'absolute inset-0',
              )}
            >
              <div className={cm.cn(cm.h(0), cm.w('full'), 'border-t border-border')}></div>
              <div className={cm.cn(cm.h(0), cm.w('full'), 'border-t border-border')}></div>
              <div className={cm.cn(cm.h(0), cm.w('full'), 'border-t border-border')}></div>
              <div className={cm.cn(cm.h(0), cm.w('full'), 'border-t border-border')}></div>
            </div>
            <svg
              className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0 overflow-visible')}
              viewBox="0 0 1000 200"
              preserveAspectRatio="none"
              data-mol-id="engagement-chart-svg"
            >
              <defs>
                <linearGradient id="line-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2"></stop>
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              {points.length > 0 && (
                <>
                  <path d={buildAreaPath(points, 1000, 200)} fill="url(#line-gradient)"></path>
                  <path
                    d={buildPath(points, 1000, 200)}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeLinecap="round"
                    strokeWidth="4"
                  ></path>
                  {points.map((p, i) => {
                    const stepX = points.length === 1 ? 0 : 1000 / (points.length - 1)
                    const x = stepX === 0 ? 500 : i * stepX
                    const max = Math.max(...points.map((pt) => pt.views), 1)
                    const y = 200 - (p.views / max) * 200
                    return (
                      <circle
                        key={p.date}
                        cx={x}
                        cy={y}
                        r={4}
                        fill="var(--color-surface)"
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                      ></circle>
                    )
                  })}
                </>
              )}
              {points.length === 0 && (
                <text
                  x="500"
                  y="100"
                  textAnchor="middle"
                  className={cm.textSize('sm')}
                  fill="var(--color-on-surface-variant)"
                >
                  {t(
                    'engagementTrendsSection.noData',
                    {},
                    { defaultValue: 'No view data yet — publish a post to start tracking.' },
                  )}
                </text>
              )}
            </svg>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'absolute inset-x-0 -bottom-6 text-[10px] text-foreground-secondary uppercase tracking-widest',
              )}
            >
              {labels.map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default EngagementTrendsSection
export { EngagementTrendsSection }
