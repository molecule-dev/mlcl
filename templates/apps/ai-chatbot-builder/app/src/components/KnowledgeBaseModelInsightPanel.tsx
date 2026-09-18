import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeBaseModelInsightPanel() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-gradient-to-br from-tertiary-container/10 to-transparent rounded-[2rem] border border-tertiary-container/20 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 4), 'gap-3')}>
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg bg-tertiary-container text-on-tertiary-container',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            data-icon="psychology"
          >
            psychology
          </span>
        </div>
        <h4
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-tertiary',
          )}
        >
          {t('knowledgeBaseModelInsightPanel.title', {}, { defaultValue: 'Model Insight' })}
        </h4>
      </div>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
        {t(
          'knowledgeBaseModelInsightPanel.insight',
          { category: 'API Reference', percentage: 14 },
          {
            defaultValue:
              'Adding more {{category}} material could increase response accuracy by up to {{percentage}}% for technical queries.',
          },
        )}
      </p>
    </div>
  )
}

export default KnowledgeBaseModelInsightPanel
export { KnowledgeBaseModelInsightPanel }
