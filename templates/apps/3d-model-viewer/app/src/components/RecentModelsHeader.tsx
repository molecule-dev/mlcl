import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function RecentModelsHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
      <h3
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-headline text-on-surface')}
      >
        {t('recentModelsHeader.title', {}, { defaultValue: 'Recent Models' })}
      </h3>
      <Link
        className={cm.cn(
          'text-sm font-medium text-primary hover:text-primary-container transition-colors',
        )}
        to="/models"
      >
        {t('recentModelsHeader.viewAll', {}, { defaultValue: 'View All' })}
      </Link>
    </div>
  )
}
export default RecentModelsHeader
export { RecentModelsHeader }
