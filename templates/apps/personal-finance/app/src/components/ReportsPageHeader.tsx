import { useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ReportsPageHeader() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleExportPdf = async () => {
    setLoading(true)
    try {
      await http.post('/api/reports/export-pdf')
    } finally {
      setLoading(false)
    }
  }

  return (
    <header
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', align: 'start', gap: 'lg' }),
        'md:flex-row md:items-end',
      )}
      data-mol-id="content-header"
    >
      <div>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mb', 2),
            'font-extrabold font-headline tracking-tight text-on-surface',
          )}
          data-mol-id="page-title"
        >
          {t('reportsPageHeader.title', {}, { defaultValue: 'Financial Reports' })}
        </h1>
        <p
          className={cm.cn(cm.maxW('lg'), 'text-on-surface-variant font-body')}
          data-mol-id="page-subtitle"
        >
          {t(
            'reportsPageHeader.subtitle',
            {},
            {
              defaultValue:
                'Curated insights into your wealth trajectory and spending habits. High-resolution data for precise decision making.',
            },
          )}
        </p>
      </div>
      <button
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.fontWeight('bold'),
          'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
        )}
        data-mol-id="export-pdf-btn"
        onClick={handleExportPdf}
        disabled={loading}
      >
        <span className={cm.cn('material-symbols-outlined')}>picture_as_pdf</span>
        {t('reportsPageHeader.exportPdf', {}, { defaultValue: 'Export PDF' })}
      </button>
    </header>
  )
}
export default ReportsPageHeader
export { ReportsPageHeader }
