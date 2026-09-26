import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ReportThumbnailCard, type ReportThumbnailData } from '../components/ReportThumbnailCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [reports, setReports] = useState<ReportThumbnailData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/saved_reports')
      .then((res) => {
        if (!cancelled) setReports(unwrapList<ReportThumbnailData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadReports', {}, { defaultValue: 'Failed to load reports.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function handleNewReport() {
    navigate('/query')
  }

  const scheduled = reports.filter((r) => r.schedule).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.flex({ direction: 'col', gap: 6 }))}>
      <div className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 4 })}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface-variant',
            )}
          >
            {t(
              'reports.eyebrow',
              { count: reports.length, scheduled },
              { defaultValue: '{{count}} reports · {{scheduled}} scheduled' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'font-headline tracking-tight',
            )}
          >
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-xl')}
          >
            {t(
              'reports.subhead',
              {},
              {
                defaultValue:
                  'Saved analyses you can share, schedule, and export. Click any thumbnail to open the full report.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewReport}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 transition-opacity',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
            aria-hidden="true"
          >
            add
          </span>
          {t('reports.newCta', {}, { defaultValue: 'New report' })}
        </button>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2 xl:grid-cols-3')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={'rounded-2xl bg-surface-container-low animate-pulse h-[260px]'}
            />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('reports.empty', {}, { defaultValue: 'No reports yet — run a query and save it.' })}
        </p>
      ) : (
        <ul
          className={cm.cn(
            cm.grid({ cols: 1, gap: 4 }),
            'sm:grid-cols-2 xl:grid-cols-3 list-none p-0',
          )}
        >
          {reports.map((r) => (
            <li key={r.id}>
              <ReportThumbnailCard report={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Reports
