import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type DateRange = '7d' | '30d' | '90d' | '12m'

interface ReportsPageHeaderProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

function ReportsPageHeader({ dateRange, onDateRangeChange }: ReportsPageHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const now = new Date()
  const monthShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][now.getMonth()]
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dateRangeLabels: Record<DateRange, string> = {
    '7d': t('reportsPageHeader.last7Days', {}, { defaultValue: 'Last 7 days' }),
    '30d': t(
      'reportsPageHeader.calendarMonth',
      { start: `${monthShort} 1`, end: `${monthShort} ${lastDay}`, year: now.getFullYear() },
      { defaultValue: '{{start}} – {{end}}, {{year}}' },
    ),
    '90d': t('reportsPageHeader.last90Days', {}, { defaultValue: 'Last 90 days' }),
    '12m': t('reportsPageHeader.last12Months', {}, { defaultValue: 'Last 12 months' }),
  }
  const ranges: DateRange[] = ['7d', '30d', '90d', '12m']
  function cycleRange() {
    const idx = ranges.indexOf(dateRange)
    onDateRangeChange(ranges[(idx + 1) % ranges.length])
  }

  function handleExport() {
    const rows = [
      ['Metric', 'Value'],
      [t('nav.reports', {}, { defaultValue: 'Reports' }), dateRangeLabels[dateRange]],
      [
        t('reportsPageHeader.exportGeneratedAt', {}, { defaultValue: 'Generated at' }),
        new Date().toISOString(),
      ],
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `crm-reports-${dateRange}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  return (
    <header className={cm.flex({ justify: 'between', align: 'end' })}>
      <div>
        <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'reportsPageHeader.subtitle',
            {},
            { defaultValue: 'Real-time enterprise analytics and performance metrics.' },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
        <button
          onClick={cycleRange}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.cursorPointer,
            'bg-surface-container-low rounded-lg py-2.5 gap-3 border-none',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}
            data-icon="calendar_today"
          >
            calendar_today
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {dateRangeLabels[dateRange]}
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}
            data-icon="expand_more"
          >
            expand_more
          </span>
        </button>
        <button
          onClick={handleExport}
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 5),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-gradient-to-r from-primary to-secondary-container text-white py-2.5 rounded-lg gap-2 architectural-shadow',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            data-icon="download"
          >
            download
          </span>
          {t('common.export', {}, { defaultValue: 'Export' })}
        </button>
      </div>
    </header>
  )
}

export default ReportsPageHeader
export { ReportsPageHeader }
