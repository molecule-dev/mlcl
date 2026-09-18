import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ChartPoint {
  date: string
  views: number
}

interface ViewsOverTimeChartProps {
  points?: ChartPoint[]
  totalViews?: number
}

function buildPath(points: ChartPoint[], width: number, height: number): string {
  if (points.length === 0) return ''
  const max = Math.max(1, ...points.map((p) => p.views))
  const stepX = points.length > 1 ? width / (points.length - 1) : 0
  return points
    .map((p, i) => {
      const x = i * stepX
      const y = height - (p.views / max) * (height - 20) - 10
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function ViewsOverTimeChart({ points = [], totalViews }: ViewsOverTimeChartProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const handleDownload = () => {
    const rows = [['date', 'views'], ...points.map((p) => [p.date, String(p.views)])]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'views-over-time.csv'
    a.click()
    URL.revokeObjectURL(url)
    setDownloadStatus(
      t('viewsOverTimeChart.downloadStarted', {}, { defaultValue: 'Chart data downloaded.' }),
    )
  }

  const handleMenuToggle = () => setMenuOpen((prev) => !prev)
  const path = buildPath(points, 800, 320)
  const xAxisLabels =
    points.length >= 2
      ? [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
      : points

  return (
    <div
      data-mol-id="analytics-views-chart"
      className={cm.cn(
        cm.sp('p', 8),
        'col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <h4 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), "font-['Newsreader']")}>
            {t('viewsOverTimeChart.title', {}, { defaultValue: 'Views Over Time' })}
          </h4>
          <p
            data-mol-id="analytics-views-total"
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
          >
            {t(
              'viewsOverTimeChart.totalViews',
              { count: (totalViews ?? 0).toLocaleString() },
              { defaultValue: '{{count}} total views' },
            )}
          </p>
          {downloadStatus ? (
            <p
              role="status"
              aria-live="polite"
              data-mol-id="analytics-download-status"
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
            >
              {downloadStatus}
            </p>
          ) : null}
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          <button
            onClick={handleDownload}
            data-mol-id="analytics-download-button"
            aria-label={t(
              'viewsOverTimeChart.downloadChart',
              {},
              { defaultValue: 'Download chart' },
            )}
            className={cm.cn(
              cm.sp('p', 2),
              cm.textSize('sm'),
              'bg-surface-container rounded-lg material-symbols-outlined',
            )}
            data-icon="download"
          >
            download
          </button>
          <div className={cm.fvdef3facc} ref={menuRef}>
            <button
              onClick={handleMenuToggle}
              aria-label={t('viewsOverTimeChart.moreOptions', {}, { defaultValue: 'More options' })}
              className={cm.cn(
                cm.sp('p', 2),
                cm.textSize('sm'),
                'bg-surface-container rounded-lg material-symbols-outlined',
              )}
              data-icon="more_vert"
            >
              more_vert
            </button>
            {menuOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.w(48),
                  'absolute right-0 bg-surface-container rounded-lg shadow-lg z-50 border border-outline/10',
                )}
              >
                <div className={cm.cn(cm.sp('p', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('viewsOverTimeChart.menuLabel', {}, { defaultValue: 'Menu options' })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w('full'),
          'h-[320px]',
          'relative bg-surface-container-low rounded-lg overflow-hidden',
        )}
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0')}
          preserveAspectRatio="none"
          viewBox="0 0 800 320"
          aria-label="Views over time chart"
        >
          {path ? (
            <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="3" />
          ) : null}
          <defs>
            <linearGradient id="gradient-chart" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop
                offset="0%"
                style={{ stopColor: 'var(--color-status-published)', stopOpacity: '0.1' }}
              />
              <stop
                offset="100%"
                style={{ stopColor: 'var(--color-status-published)', stopOpacity: '0' }}
              />
            </linearGradient>
          </defs>
        </svg>
        {points.length === 0 ? (
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'z-10 opacity-40')}>
            <span
              className={cm.cn(cm.sp('mb', 2), 'material-symbols-outlined text-6xl')}
              data-icon="show_chart"
            >
              show_chart
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest',
              )}
            >
              {t('viewsOverTimeChart.noData', {}, { defaultValue: 'No views yet' })}
            </span>
          </div>
        ) : null}
        {xAxisLabels.length > 0 ? (
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.sp('px', 8),
              cm.fontWeight('bold'),
              cm.w('full'),
              'absolute bottom-4 left-0 text-[10px] text-on-surface-variant/40',
            )}
          >
            {xAxisLabels.map((p) => (
              <span key={p.date}>{p.date.slice(5)}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ViewsOverTimeChart
export { ViewsOverTimeChart }
