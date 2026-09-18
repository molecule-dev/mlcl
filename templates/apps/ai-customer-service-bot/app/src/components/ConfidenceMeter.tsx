/**
 * Horizontal confidence-score meter — 6px pill with low→high gradient
 * fill. Used by KnowledgeBase article cards and ConversationDetail
 * AI suggestion panels.
 *
 * Pattern source: personal-finance progress meter + ai-chatbot-builder
 * BotAnalyticsKPICard.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ConfidenceMeterProps {
  /** 0-1 normalized confidence. */
  value: number
  /** Optional label override. */
  label?: string
  /** Hide the numeric percentage label on the right. */
  hideValue?: boolean
}

function ConfidenceMeter({ value, label, hideValue = false }: ConfidenceMeterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(1, value))
  const display = label ?? t('confidenceMeter.label', {}, { defaultValue: 'Confidence' })
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'baseline' }))}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'tracking-wide uppercase text-on-surface-variant',
          )}
        >
          {display}
        </span>
        {!hideValue && (
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'font-mono text-on-surface tabular-nums',
            )}
          >
            {Math.round(pct * 100)}%
          </span>
        )}
      </div>
      <div
        className={cm.cn(
          cm.h(2),
          cm.w('full'),
          cm.roundedFull,
          'bg-surface-container-high overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.h('full'),
            cm.roundedFull,
            'bg-gradient-to-r from-[var(--color-confidence-low)] via-[var(--color-confidence-mid)] to-[var(--color-confidence-high)] transition-[width] duration-500 ease-out',
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

export default ConfidenceMeter
export { ConfidenceMeter }
