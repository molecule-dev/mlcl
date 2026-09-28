import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotEditorCanvas() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.flex1, cm.sp('p', 12), 'relative overflow-hidden canvas-on-dark')}>
      {/* SVG Background Layer for Connections */}
      <svg className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0 pointer-events-none')}>
        <defs>
          <marker
            id="arrowhead"
            markerHeight="7"
            markerWidth="10"
            orient="auto"
            refX="0"
            refY="3.5"
          >
            <polygon
              fill="var(--color-flow-connector)"
              opacity="0.4"
              points="0 0, 10 3.5, 0 7"
            ></polygon>
          </marker>
        </defs>
        {/* Start to Classification */}
        <path
          className={cm.cn('bezier-connection')}
          d="M 120 180 Q 200 180 250 180"
          fill="none"
          opacity="0.4"
          stroke="var(--color-flow-connector)"
          strokeWidth="2"
        ></path>
        {/* Branch 1: Billing */}
        <path
          className={cm.cn('bezier-connection')}
          d="M 460 160 Q 520 80 580 80"
          fill="none"
          opacity="0.4"
          stroke="var(--color-flow-connector)"
          strokeWidth="2"
        ></path>
        <path
          className={cm.cn('bezier-connection')}
          d="M 760 80 Q 820 80 880 80"
          fill="none"
          opacity="0.4"
          stroke="var(--color-flow-connector)"
          strokeWidth="2"
        ></path>
        {/* Branch 2: Technical */}
        <path
          className={cm.cn('bezier-connection')}
          d="M 460 180 Q 520 180 580 180"
          fill="none"
          opacity="0.4"
          stroke="var(--color-flow-connector)"
          strokeWidth="2"
        ></path>
        {/* Branch 3: General Inquiry (Active Path) */}
        <path
          className={cm.cn('bezier-connection')}
          d="M 460 200 Q 520 300 580 300"
          fill="none"
          stroke="var(--color-flow-connector-active)"
          strokeWidth="2.5"
        ></path>
      </svg>
      {/* Start Node */}
      <div className={cm.cn('absolute left-12 top-40 z-10')}>
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'gap-2')}>
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-green-500/20 border-2 border-green-500/50 text-green-400',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="inbox">
              inbox
            </span>
          </div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] text-on-surface-variant uppercase',
            )}
          >
            {t('botEditorCanvas.userMessage', {}, { defaultValue: 'User Message' })}
          </span>
        </div>
      </div>
      {/* Intent Classification Node */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col' }),
          cm.w(48),
          'absolute left-64 top-32 bg-surface-container rounded-xl shadow-2xl gap-3',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{ ['--mol-accent' as string]: 'var(--color-indigo-500)' }}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.accentCardLabel({ tone: 'custom' })}>
            {t('botEditorCanvas.logicNodeLabel', {}, { defaultValue: 'Logic Node' })}
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}
            data-icon="drag_indicator"
          >
            drag_indicator
          </span>
        </div>
        <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('botEditorCanvas.classifyIntentTitle', {}, { defaultValue: 'Classify Intent' })}
        </h3>
        <div className={cm.cn('space-y-1.5')}>
          <div
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.flex({ justify: 'between' }),
              'text-[10px] bg-surface-container-highest rounded text-on-surface',
            )}
          >
            {t('botEditorCanvas.billingInquiry', {}, { defaultValue: 'Billing Inquiry' })}
            <span
              className={cm.cn('material-symbols-outlined text-[12px]')}
              data-icon="chevron_right"
            >
              chevron_right
            </span>
          </div>
          <div
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.flex({ justify: 'between' }),
              'text-[10px] bg-surface-container-highest rounded text-on-surface',
            )}
          >
            {t('botEditorCanvas.technicalSupport', {}, { defaultValue: 'Technical Support' })}
            <span
              className={cm.cn('material-symbols-outlined text-[12px]')}
              data-icon="chevron_right"
            >
              chevron_right
            </span>
          </div>
          <div
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.flex({ justify: 'between' }),
              cm.fontWeight('bold'),
              'text-[10px] bg-primary/20 rounded text-primary',
            )}
          >
            {t('botEditorCanvas.generalInquiry', {}, { defaultValue: 'General Inquiry' })}
            <span
              className={cm.cn('material-symbols-outlined text-[12px]')}
              data-icon="chevron_right"
            >
              chevron_right
            </span>
          </div>
        </div>
      </div>
      {/* Level 2 Nodes */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col' }),
          cm.w(44),
          'absolute left-[580px] top-10 bg-surface-container rounded-xl gap-2 opacity-60',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{ ['--mol-accent' as string]: 'var(--color-outline)' }}
      >
        <span className={cm.accentCardLabel({ tone: 'custom' })}>
          {t('botEditorCanvas.actionLabel', {}, { defaultValue: 'Action' })}
        </span>
        <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('botEditorCanvas.checkAccountTitle', {}, { defaultValue: 'Check Account' })}
        </h3>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col' }),
          cm.w(44),
          'absolute left-[580px] top-40 bg-surface-container rounded-xl gap-2 opacity-60',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{ ['--mol-accent' as string]: 'var(--color-outline)' }}
      >
        <span className={cm.accentCardLabel({ tone: 'custom' })}>
          {t('botEditorCanvas.formLabel', {}, { defaultValue: 'Form' })}
        </span>
        <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('botEditorCanvas.gatherDetailsTitle', {}, { defaultValue: 'Gather Details' })}
        </h3>
      </div>
      {/* Selected AI Response Node */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col' }),
          cm.w(52),
          'absolute left-[580px] top-64 bg-surface-container-high rounded-xl shadow-[0_0_30px_rgba(192,193,255,0.15)] ring-1 ring-primary/40 gap-3',
          cm.accentCard({ tone: 'primary' }),
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.accentCardLabel({ tone: 'primary' })}>
            {t('botEditorCanvas.aiAgentLabel', {}, { defaultValue: 'AI Agent' })}
          </span>
          <div className={cm.cn(cm.flex(), 'gap-1')}>
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-primary')}
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
          {t('botEditorCanvas.aiResponseTitle', {}, { defaultValue: 'AI Response' })}
        </h3>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'gap-2 text-[10px] text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
            data-icon="database"
          >
            database
          </span>

          {t(
            'botEditorCanvas.linkedToKnowledgeBase',
            {},
            { defaultValue: 'Linked to Knowledge Base' },
          )}
        </div>
      </div>
      {/* Final Destination Nodes */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col' }),
          cm.w(44),
          'absolute left-[880px] top-10 bg-surface-container rounded-xl gap-2 opacity-60',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{
          ['--mol-accent' as string]: 'color-mix(in srgb, var(--color-green-500) 50%, transparent)',
        }}
      >
        <span className={cm.accentCardLabel({ tone: 'custom' })}>
          {t('botEditorCanvas.outputLabel', {}, { defaultValue: 'Output' })}
        </span>
        <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('botEditorCanvas.sendBillingInfoTitle', {}, { defaultValue: 'Send Billing Info' })}
        </h3>
      </div>
    </section>
  )
}

export default BotEditorCanvas
export { BotEditorCanvas }
