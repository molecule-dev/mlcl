import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ActivitiesPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState('last30Days')
  const dateFilterRef = useRef<HTMLDivElement>(null)
  const dateFilterOptions = [
    {
      key: 'last7Days',
      label: t('activitiesPageHeader.filterLast7Days', {}, { defaultValue: 'Last 7 Days' }),
    },
    {
      key: 'last30Days',
      label: t('activitiesPageHeader.filterLast30Days', {}, { defaultValue: 'Last 30 Days' }),
    },
    {
      key: 'last90Days',
      label: t('activitiesPageHeader.filterLast90Days', {}, { defaultValue: 'Last 90 Days' }),
    },
    {
      key: 'allTime',
      label: t('activitiesPageHeader.filterAllTime', {}, { defaultValue: 'All Time' }),
    },
  ]

  useEffect(() => {
    if (!dateFilterOpen) return
    const handler = (e: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target as Node)) {
        setDateFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dateFilterOpen])
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('mb', 8),
        'md:flex-row md:items-end gap-6',
      )}
    >
      <div>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'gap-2 text-foreground-tertiary tracking-widest uppercase',
          )}
        >
          <span>
            {t('activitiesPageHeader.breadcrumbRoot', {}, { defaultValue: 'Activities' })}
          </span>
          <span className={cm.fv9bf952d5}>chevron_right</span>
          <span className={cm.textPrimary}>
            {t('activitiesPageHeader.breadcrumbCurrent', {}, { defaultValue: 'Timeline' })}
          </span>
        </nav>
        <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('activitiesPageHeader.title', {}, { defaultValue: 'Activity Timeline' })}
        </h2>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
        <div className={cm.fvd683bc2b} ref={dateFilterRef}>
          <button
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'gap-2 py-2 bg-surface border border-outline-variant/30 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-all',
            )}
            onClick={() => setDateFilterOpen((o) => !o)}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              calendar_month
            </span>

            {dateFilterOptions.find((o) => o.key === dateFilter)?.label}

            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              expand_more
            </span>
          </button>
          {dateFilterOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 1),
                'absolute right-0 top-full bg-surface border border-outline-variant/30 rounded-xl shadow-lg z-10 min-w-[160px] overflow-hidden',
              )}
            >
              {dateFilterOptions.map(({ key, label }) => (
                <button
                  key={key}
                  className={cm.cn(
                    'w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-low transition-colors',
                    dateFilter === key ? 'text-primary font-semibold' : 'text-on-surface-variant',
                  )}
                  onClick={() => {
                    setDateFilter(key)
                    setDateFilterOpen(false)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'gap-2 py-2 bg-primary-container text-white rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
          )}
          onClick={() => navigate('/activities/new')}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add_circle</span>

          {t('activitiesPageHeader.logActivity', {}, { defaultValue: 'Log Activity' })}
        </button>
      </div>
    </div>
  )
}
export { ActivitiesPageHeader }
