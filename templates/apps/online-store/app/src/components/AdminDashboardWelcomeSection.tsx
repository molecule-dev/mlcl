import React from 'react'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AdminDashboardWelcomeSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth() as { user?: { name?: string; email?: string } }
  const [downloading, setDownloading] = React.useState(false)

  // Use the real authenticated user's first name. The previous version
  // hardcoded "Alex" — leaks pre-launch design copy into every account.
  const fullName = auth.user?.name?.trim() || ''
  const firstName = fullName ? fullName.split(/\s+/)[0] : auth.user?.email?.split('@')[0] || ''

  async function handleDownloadReport() {
    setDownloading(true)
    try {
      // Real CSV download. fetch() instead of http.get because
      // http.get tries to parse the body as JSON, but the admin
      // reports endpoint returns text/csv. We surface the CSV as
      // a real <a download> click so the browser saves a file.
      const res = await fetch('/api/admin/reports/orders.csv', {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 8))}>
      <div>
        <h3
          data-mol-id="admin-greeting"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-foreground',
          )}
        >
          {firstName
            ? t(
                'adminDashboard.greeting',
                { name: firstName },
                { defaultValue: 'Good morning, {{name}}' },
              )
            : t('adminDashboard.greetingAnon', {}, { defaultValue: 'Good morning' })}
        </h3>
        <p className={cm.cn(cm.sp('mt', 1), 'text-foreground-secondary')}>
          {t(
            'adminDashboard.storeStatusSubtitle',
            {},
            { defaultValue: "Here's what's happening with your store today." },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <button
          type="button"
          data-mol-id="admin-download-report"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            'bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg transition-colors shadow-sm',
          )}
          onClick={handleDownloadReport}
          disabled={downloading}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>download</span>
          {t('adminDashboard.downloadReport', {}, { defaultValue: 'Download Report' })}
        </button>
      </div>
    </div>
  )
}
export default AdminDashboardWelcomeSection
export { AdminDashboardWelcomeSection }
