import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CompaniesTableHead() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 12 }),
        cm.sp('px', 6),
        cm.sp('py', 3),
        cm.fontWeight('bold'),
        'text-[10px] text-outline tracking-widest uppercase',
      )}
    >
      <div className={cm.fvac1f8b5e}>
        {t('companiesTableHead.companyName', {}, { defaultValue: 'Company Name' })}
      </div>
      <div className={cm.fvac1f8b5c}>
        {t('companiesTableHead.industry', {}, { defaultValue: 'Industry' })}
      </div>
      <div className={cm.cn(cm.textRight, 'col-span-1')}>
        {t('form.size', {}, { defaultValue: 'Size' })}
      </div>
      <div className={cm.cn(cm.textRight, 'col-span-2')}>
        {t('companiesTableHead.annualRevenue', {}, { defaultValue: 'Annual Revenue' })}
      </div>
      <div className={cm.cn(cm.sp('px', 4), 'col-span-2')}>
        {t('form.location', {}, { defaultValue: 'Location' })}
      </div>
      <div className={cm.fvac1f8b5b}>{t('nav.status', {}, { defaultValue: 'Status' })}</div>
    </div>
  )
}

export default CompaniesTableHead
export { CompaniesTableHead }
