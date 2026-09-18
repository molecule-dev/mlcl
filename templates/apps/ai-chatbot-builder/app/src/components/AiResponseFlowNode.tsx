import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function AiResponseFlowNode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 4),
        cm.w(52),
        'absolute left-[580px] top-64 bg-surface-container-high rounded-xl border-l-4 border-primary shadow-[0_0_30px_rgba(192,193,255,0.15)] ring-1 ring-primary/40 gap-3',
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textPrimary,
            'text-[10px] uppercase tracking-widest',
          )}
        >
          {t('aiResponseFlowNode.agentLabel', {}, { defaultValue: 'AI Agent' })}
        </span>
        <div className={cm.cn(cm.flex(), 'gap-1')}>
          <span
            className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'material-symbols-outlined')}
            data-icon="auto_awesome"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}
            data-icon="drag_indicator"
          >
            drag_indicator
          </span>
        </div>
      </div>
      <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
        {t('aiResponseFlowNode.title', {}, { defaultValue: 'AI Response' })}
      </h3>
      <div
        className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 text-[10px] text-on-surface-variant')}
      >
        <span
          className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
          data-icon="database"
        >
          database
        </span>
        {t(
          'aiResponseFlowNode.knowledgeBaseLink',
          {},
          { defaultValue: 'Linked to Knowledge Base' },
        )}
      </div>
    </div>
  )
}
export { AiResponseFlowNode }
