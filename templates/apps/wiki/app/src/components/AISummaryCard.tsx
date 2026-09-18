import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * AI summary card — DESIGN.md "AI Summary Card" anatomy: indigo→amber
 * 4%-opacity gradient background, primary 30%-opacity hairline border,
 * sparkle icon header, secondary body text. Sits inline at the top of
 * PageView so readers see the gist before the article body.
 *
 * Translated from ai-chatbot-builder/SuggestionCard.tsx + applicant-tracking
 * AI summary box — same anatomy (sparkle eyebrow, gradient backdrop,
 * regenerate button) with editorial typography.
 */

export interface AISummaryCardProps {
  summary: string
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export function AISummaryCard({ summary, onRegenerate, isRegenerating }: AISummaryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <aside
      className={cm.cn(
        cm.sp('p', 5),
        'rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-7 w-7 rounded-md bg-primary/15 text-primary',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>auto_awesome</span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface tracking-tight',
            )}
          >
            {t('aiSummaryCard.heading', {}, { defaultValue: 'AI summary' })}
          </span>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 0),
              'rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary',
            )}
          >
            {t('aiSummaryCard.beta', {}, { defaultValue: 'Beta' })}
          </span>
        </div>
        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'h-7 rounded-md text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors',
            )}
          >
            <span
              className={cm.cn(
                'material-symbols-outlined text-[14px]',
                isRegenerating ? 'animate-spin' : '',
              )}
              aria-hidden="true"
            >
              refresh
            </span>
            {isRegenerating
              ? t('aiSummaryCard.regenerating', {}, { defaultValue: 'Summarizing…' })
              : t('aiSummaryCard.regenerate', {}, { defaultValue: 'Regenerate' })}
          </button>
        ) : null}
      </div>
      <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
        {summary}
      </p>
    </aside>
  )
}
