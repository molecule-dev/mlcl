import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DealsPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [, setFiltersOpen] = useState(false)
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
      <div>
        <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('dealsPageHeader.title', {}, { defaultValue: 'Deals Pipeline' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('dealsPageHeader.pipelineValueLabel', {}, { defaultValue: 'Total Pipeline Value: ' })}
          <span className={cm.cn(cm.fontWeight('bold'), cm.textPrimary)}>
            {t(
              'dealsPageHeader.pipelineAmount',
              { amount: '$1,060,000' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
          {t(
            'dealsPageHeader.pipelineDealCount',
            { count: 39 },
            { defaultValue: ' across {{count}} deals' },
          )}
        </p>
      </div>
      <div className={cm.flex({ gap: 'sm' })}>
        <div
          className={cm.cn(
            cm.flex(),
            cm.sp('p', 1),
            'bg-surface-container-low rounded-lg border border-outline-variant/15',
          )}
        >
          <button
            className={
              view === 'kanban'
                ? 'px-3 py-1.5 bg-surface-container-lowest shadow-sm rounded-lg text-xs font-bold text-primary'
                : 'px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface'
            }
            data-mol-id="view-kanban"
            onClick={() => setView('kanban')}
          >
            {t('dealsPageHeader.viewKanban', {}, { defaultValue: 'Kanban' })}
          </button>
          <button
            className={
              view === 'list'
                ? 'px-3 py-1.5 bg-surface-container-lowest shadow-sm rounded-lg text-xs font-bold text-primary'
                : 'px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface'
            }
            data-mol-id="view-list"
            onClick={() => setView('list')}
          >
            {t('dealsPageHeader.viewList', {}, { defaultValue: 'List' })}
          </button>
        </div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'bg-surface-container-lowest border border-outline-variant/20 rounded-lg hover:bg-surface-container-low transition-colors',
          )}
          data-mol-id="filter-btn"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className={cm.fv5b245ffa} style={{ fontSize: '16px' }}>
            filter_list
          </span>
          {t('common.filters', {}, { defaultValue: 'Filters' })}
        </button>
      </div>
    </div>
  )
}

export default DealsPageHeader
export { DealsPageHeader }
