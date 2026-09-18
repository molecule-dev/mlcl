import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VolPoint {
  label: string
  count: number
}
function ReportsTicketVolumeChart({
  volumeData = [],
  loading = false,
}: {
  volumeData?: VolPoint[]
  loading?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const volMax = Math.max(...(volumeData.length > 0 ? volumeData.map((v) => v.count) : [1]), 1)
  const handleCsvExport = () => {
    const rows = [['Label', 'Count'], ...volumeData.map((v) => [v.label, String(v.count)])]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ticket-volume.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        cm.stack(6),
        'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
        <div>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('reportsTicketVolumeChart.title', {}, { defaultValue: 'Ticket Volume' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'reportsTicketVolumeChart.subtitle',
              {},
              { defaultValue: 'Incoming request frequency per day' },
            )}
          </p>
        </div>
        <div className={cm.flex({ gap: 2 })}>
          <button
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'text-[10px] border border-outline-variant rounded hover:bg-surface-container-low',
            )}
            onClick={handleCsvExport}
          >
            {t('reportsTicketVolumeChart.exportCsv', {}, { defaultValue: 'CSV' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'text-[10px] border border-outline-variant rounded hover:bg-surface-container-low',
            )}
            onClick={() => window.print()}
          >
            {t('reportsTicketVolumeChart.exportPdf', {}, { defaultValue: 'Print' })}
          </button>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', gap: 4 }),
          cm.sp('px', 4),
          'h-[300px] border-b border-outline-variant/20',
        )}
      >
        {loading ? (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w('full'),
              cm.h('full'),
            )}
          >
            <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </span>
          </div>
        ) : (
          volumeData.map((v, i) => {
            const h = Math.max(Math.round((v.count / volMax) * 280), 4)
            return (
              <div
                key={i}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 4 }),
                  cm.w('full'),
                )}
              >
                <div
                  className={cm.cn(
                    cm.w('full'),
                    'bg-primary/30 rounded-t-sm relative group transition-all',
                  )}
                  style={{ height: h }}
                >
                  <div
                    className={cm.cn(
                      cm.sp('py', 1),
                      cm.sp('px', 2),
                      'absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity',
                    )}
                  >
                    {v.count}
                  </div>
                </div>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}
                >
                  {v.label}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ReportsTicketVolumeChart
export { ReportsTicketVolumeChart }
