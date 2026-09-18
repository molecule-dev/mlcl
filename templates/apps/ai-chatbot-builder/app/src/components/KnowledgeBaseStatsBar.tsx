import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeBaseStatsBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/20 gap-5',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(12),
            cm.h(12),
            cm.textPrimary,
            'rounded-xl bg-surface-container-low',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="description">
            description
          </span>
        </div>
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase tracking-wider text-outline',
            )}
          >
            {t('knowledgeBaseStatsBar.totalDocuments', {}, { defaultValue: 'Total Documents' })}
          </p>
          <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>3</p>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/20 gap-5',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(12),
            cm.h(12),
            cm.textPrimary,
            'rounded-xl bg-surface-container-low',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="auto_stories">
            auto_stories
          </span>
        </div>
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase tracking-wider text-outline',
            )}
          >
            {t('knowledgeBaseStatsBar.totalPages', {}, { defaultValue: 'Total Pages' })}
          </p>
          <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>85</p>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/20 gap-5',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(12),
            cm.h(12),
            cm.textPrimary,
            'rounded-xl bg-surface-container-low',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="update">
            update
          </span>
        </div>
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase tracking-wider text-outline',
            )}
          >
            {t('knowledgeBaseStatsBar.lastTrained', {}, { defaultValue: 'Last Trained' })}
          </p>
          <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('knowledgeBaseStatsBar.hoursAgo', { hours: 2 }, { defaultValue: '{{hours}}h ago' })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeBaseStatsBar
export { KnowledgeBaseStatsBar }
