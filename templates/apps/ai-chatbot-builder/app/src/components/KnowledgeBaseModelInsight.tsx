import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeBaseModelInsight() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-gradient-to-br from-tertiary-container/10 to-transparent rounded-2xl border border-tertiary-container/20',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
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
          {t('knowledgeBaseModelInsight.title', {}, { defaultValue: 'Model Insight' })}
        </h4>
      </div>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
        {''}
        {t('knowledgeBaseModelInsight.insightPrefix', {}, { defaultValue: 'Adding more' })}{' '}
        <span className={cm.fontWeight('bold')}>
          {t('knowledgeBaseModelInsight.sectionName', {}, { defaultValue: 'API Reference' })}
        </span>{' '}
        {t(
          'knowledgeBaseModelInsight.accuracyImpact',
          {},
          { defaultValue: 'material could increase response accuracy by up to' },
        )}{' '}
        <span className={cm.cn(cm.fontWeight('bold'), 'text-tertiary')}>
          {t(
            'knowledgeBaseModelInsight.percentageGain',
            { percentage: 14 },
            { defaultValue: '{{percentage}}%' },
          )}
        </span>{' '}
        {t('knowledgeBaseModelInsight.queryScope', {}, { defaultValue: 'for technical queries.' })}
        {''}
      </p>
    </div>
  )
}

export default KnowledgeBaseModelInsight
export { KnowledgeBaseModelInsight }
