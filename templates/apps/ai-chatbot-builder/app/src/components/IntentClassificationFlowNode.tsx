import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function IntentClassificationFlowNode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeIntent, setActiveIntent] = useState<string>('General Inquiry')
  const intentLabels: Record<string, string> = {
    'Billing Inquiry': t(
      'intentClassifier.billingInquiry',
      {},
      { defaultValue: 'Billing Inquiry' },
    ),
    'Technical Support': t(
      'intentClassifier.technicalSupport',
      {},
      { defaultValue: 'Technical Support' },
    ),
    'General Inquiry': t(
      'intentClassifier.generalInquiry',
      {},
      { defaultValue: 'General Inquiry' },
    ),
  }
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 4),
        'absolute left-64 top-32 w-48 bg-surface-container rounded-xl border-l-4 border-indigo-500 shadow-2xl gap-3',
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] text-on-surface-variant uppercase tracking-widest',
          )}
        >
          {t('intentClassifier.nodeType', {}, { defaultValue: 'Logic Node' })}
        </span>
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}
          data-icon="drag_indicator"
        >
          drag_indicator
        </span>
      </div>
      <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
        {t('intentClassifier.title', {}, { defaultValue: 'Classify Intent' })}
      </h3>
      <div className={cm.cn('space-y-1.5')}>
        {(['Billing Inquiry', 'Technical Support', 'General Inquiry'] as const).map((intent) => (
          <button
            key={intent}
            type="button"
            aria-pressed={activeIntent === intent}
            className={
              activeIntent === intent
                ? 'w-full text-left text-[10px] px-2 py-1 bg-primary/20 rounded text-primary flex justify-between font-bold cursor-pointer'
                : 'w-full text-left text-[10px] px-2 py-1 bg-surface-container-highest rounded text-on-surface flex justify-between cursor-pointer'
            }
            onClick={() => setActiveIntent(intent)}
          >
            {intentLabels[intent]}{' '}
            <span
              className={cm.cn('material-symbols-outlined text-[12px]')}
              data-icon="chevron_right"
            >
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
export { IntentClassificationFlowNode }
