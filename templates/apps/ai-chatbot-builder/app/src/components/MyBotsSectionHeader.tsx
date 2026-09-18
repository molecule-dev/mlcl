import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function MyBotsSectionHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.flex({ align: 'center', justify: 'between' })}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
        {t('myBotsSectionHeader.title', {}, { defaultValue: 'My Active Bots' })}
      </h2>
      <Link
        to="/bots"
        className={cm.cn(
          'text-sm font-semibold text-primary flex items-center gap-1 hover:underline',
        )}
      >
        {t('common.viewAll', {}, { defaultValue: 'View All' })}
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
          data-icon="chevron_right"
        >
          chevron_right
        </span>
      </Link>
    </div>
  )
}

export default MyBotsSectionHeader
export { MyBotsSectionHeader }
