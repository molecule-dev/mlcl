import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DealPipelineHeader({ totalDeals = 28 }: { totalDeals?: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.flex({ justify: 'between', align: 'end' })}>
      <div>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('dealPipelineHeader.title', {}, { defaultValue: 'Deal Pipeline' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'dealPipelineHeader.subtitle',
            { totalDeals },
            {
              defaultValue:
                'Visualizing {{totalDeals}} deals in progress across the full pipeline.',
            },
          )}
        </p>
      </div>
      <Link to="/deals" className={cm.fv264e4c9c}>
        {t('common.viewAll', {}, { defaultValue: 'View all' })}
        <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>arrow_forward</span>
      </Link>
    </div>
  )
}

export default DealPipelineHeader
export { DealPipelineHeader }
