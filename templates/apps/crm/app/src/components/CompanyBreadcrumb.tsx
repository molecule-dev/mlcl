import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CompanyBreadcrumb({ company }: { company: { name: string } | null }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <nav
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        cm.sp('mb', 2),
        'gap-2 uppercase tracking-widest text-on-surface-variant',
      )}
    >
      <Link to="/" className={cm.cn(cm.cursorPointer, 'hover:text-primary')}>
        {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
      </Link>
      <span className={cm.fv9bf952d5} data-icon="chevron_right">
        chevron_right
      </span>
      <Link to="/companies" className={cm.fvffd06006}>
        {t('companyBreadcrumb.companies', {}, { defaultValue: 'Companies' })}
      </Link>
      <span className={cm.fv9bf952d5} data-icon="chevron_right">
        chevron_right
      </span>
      <span className={cm.fvbf68a75f}>
        {company?.name ?? t('companyBreadcrumb.nameFallback', {}, { defaultValue: '…' })}
      </span>
    </nav>
  )
}

export default CompanyBreadcrumb
export { CompanyBreadcrumb }
