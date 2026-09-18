import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeBaseSourcesHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [view, setView] = useState<'grid' | 'list'>('grid')

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 2),
        cm.sp('mb', 4),
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-outline uppercase tracking-[0.15em]',
        )}
      >
        {t('knowledgeBaseSourcesHeader.title', {}, { defaultValue: 'Recent Sources' })}
      </h3>
      <div className={cm.flex({ gap: 'sm' })}>
        <button
          aria-label={t('knowledgeBaseSourcesHeader.gridView', {}, { defaultValue: 'Grid view' })}
          aria-pressed={view === 'grid'}
          className={
            view === 'grid'
              ? 'p-1.5 rounded bg-surface-container-high text-primary'
              : 'p-1.5 rounded text-outline hover:bg-surface-container-low transition-colors'
          }
          onClick={() => setView('grid')}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
            data-icon="grid_view"
          >
            grid_view
          </span>
        </button>
        <button
          aria-label={t('knowledgeBaseSourcesHeader.listView', {}, { defaultValue: 'List view' })}
          aria-pressed={view === 'list'}
          className={
            view === 'list'
              ? 'p-1.5 rounded bg-surface-container-high text-primary'
              : 'p-1.5 rounded text-outline hover:bg-surface-container-low transition-colors'
          }
          onClick={() => setView('list')}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))} data-icon="list">
            list
          </span>
        </button>
      </div>
    </div>
  )
}

export default KnowledgeBaseSourcesHeader
export { KnowledgeBaseSourcesHeader }
