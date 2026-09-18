import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function LeadsTableHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 12 }),
        cm.sp('px', 8),
        cm.sp('mb', 4),
        'text-on-surface-variant/60 font-label text-[0.6875rem] uppercase tracking-widest',
      )}
    >
      <div className={cm.cn('col-span-3')}>
        {t('leadsTable.nameContact', {}, { defaultValue: 'Name & Contact' })}
      </div>
      <div className={cm.cn('col-span-3')}>
        {t('leadsTable.interestedProperty', {}, { defaultValue: 'Interested Property' })}
      </div>
      <div className={cm.cn('col-span-2')}>{t('nav.status', {}, { defaultValue: 'Status' })}</div>
      <div className={cm.cn('col-span-2')}>
        {t('leadsTable.lastContact', {}, { defaultValue: 'Last Contact' })}
      </div>
      <div className={cm.cn(cm.textRight, 'col-span-2')}>
        {t('nav.actions', {}, { defaultValue: 'Actions' })}
      </div>
    </div>
  )
}
export default LeadsTableHeader
