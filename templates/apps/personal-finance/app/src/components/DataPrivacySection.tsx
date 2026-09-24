import { useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

function DataPrivacySection({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      // GET the user's full dataset and download it as a JSON file. The old path
      // (POST /api/user/export-data) was never served — there is no /user route.
      const res = await http.get('/api/export/data')
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'personal-finance-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'rounded-3xl', 'bg-surface-container-lowest ambient-shadow')}
    >
      <h2
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'text-success')}
      >
        {t('dataPrivacy.title', {}, { defaultValue: 'Data & Privacy' })}
      </h2>
      <div className={cm.stack(4)}>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-xl group hover:bg-surface-container hover:translate-x-1 transition-all',
          )}
          onClick={handleExport}
          disabled={exporting}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn('material-symbols-outlined text-foreground-tertiary')}
              data-icon="download"
            >
              download
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('dataPrivacy.exportData', {}, { defaultValue: 'Export My Data' })}
            </span>
          </div>
          <span
            className={cm.cn(
              'material-symbols-outlined text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity',
            )}
            data-icon="chevron_right"
          >
            chevron_right
          </span>
        </button>
        <ConfirmButton
          data-mol-id="settings-delete-account"
          onConfirm={onDeleteAccount}
          disarmSeconds={6}
          size="sm"
          color="error"
          variant="ghost"
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-xl group hover:bg-tertiary/10 transition-all',
          )}
          confirmLabel={t(
            'settings.deleteAccountConfirm',
            {},
            { defaultValue: 'Are you sure? This action cannot be undone.' },
          )}
          label={
            <>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-tertiary')}
                  data-icon="delete_forever"
                >
                  delete_forever
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-tertiary')}>
                  {t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
                </span>
              </div>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] text-tertiary/60 uppercase tracking-tighter',
                )}
              >
                {t('dataPrivacy.permanent', {}, { defaultValue: 'Permanent' })}
              </span>
            </>
          }
        />
      </div>
    </section>
  )
}

export default DataPrivacySection
export { DataPrivacySection }
