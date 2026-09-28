import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConfidenceMeter } from './ConfidenceMeter.js'

interface AiVerdictPanelProps {
  decision: 'approve' | 'reject' | 'escalate'
  confidence: number
  reasoning?: string
  /** Detected categories (e.g. "harassment", "spam"). */
  categories?: string[]
  /** Concrete policy violations cited. */
  policyViolations?: string[]
  recommendedAction?: string
  /** Renderer for the reasoning markdown (caller supplies markdown bond). */
  renderReasoning?: (md: string) => ReactNode
  modelName?: string
  createdAt?: string
}

const DECISION_TONE: Record<
  AiVerdictPanelProps['decision'],
  { text: string; bg: string; accent: string; defaultLabel: string }
> = {
  approve: {
    text: 'text-success',
    bg: 'bg-success-light',
    accent: 'var(--color-emerald-500)',
    defaultLabel: 'Recommend approve',
  },
  reject: {
    text: 'text-error',
    bg: 'bg-error-light',
    accent: 'var(--color-red-500)',
    defaultLabel: 'Recommend reject',
  },
  escalate: {
    text: 'text-purple-700',
    bg: 'bg-purple-50',
    accent: 'var(--color-purple-500)',
    defaultLabel: 'Recommend escalate',
  },
}

/**
 * AI verdict + confidence + reasoning panel — anchors the right column of
 * ReviewDetail. Always shows confidence (DESIGN.md: "never hide uncertainty").
 */
export function AiVerdictPanel(props: AiVerdictPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = DECISION_TONE[props.decision]
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        cm.stack(4),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl bg-surface-container-lowest shadow-sm',
      )}
      style={{ ['--mol-accent' as string]: tone.accent }}
      aria-labelledby="ai-verdict-heading"
    >
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'gap-3')}>
        <div>
          <p className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), 'font-label')}>
            {t('aiVerdict.heading', {}, { defaultValue: 'AI Recommendation' })}
          </p>
          <h3
            id="ai-verdict-heading"
            className={cm.cn('mt-1 text-xl font-bold tracking-tight font-headline', tone.text)}
          >
            {t(`aiVerdict.decision.${props.decision}`, {}, { defaultValue: tone.defaultLabel })}
          </h3>
        </div>
        <span
          className={cm.cn(
            'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
            tone.text,
            tone.bg,
          )}
        >
          {props.decision.toUpperCase()}
        </span>
      </header>

      <div>
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
          )}
        >
          {t('aiVerdict.confidence', {}, { defaultValue: 'Confidence' })}
        </p>
        <ConfidenceMeter value={props.confidence} variant="detail" />
      </div>

      {props.categories && props.categories.length > 0 && (
        <div className={cm.cn('flex flex-wrap gap-2')}>
          {props.categories.map((cat) => (
            <span
              key={cat}
              className={cm.cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-surface-container-low text-on-surface-variant border border-outline-variant',
              )}
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {props.reasoning && (
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
            )}
          >
            {t('aiVerdict.reasoning', {}, { defaultValue: 'Reasoning' })}
          </p>
          <div className={cm.cn('text-sm text-on-surface leading-relaxed')}>
            {props.renderReasoning ? props.renderReasoning(props.reasoning) : props.reasoning}
          </div>
        </div>
      )}

      {props.policyViolations && props.policyViolations.length > 0 && (
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
            )}
          >
            {t('aiVerdict.policyViolations', {}, { defaultValue: 'Policy Violations' })}
          </p>
          <ul className={cm.cn('text-sm text-error list-disc pl-5 space-y-1')}>
            {props.policyViolations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {props.recommendedAction && (
        <div
          className={cm.cn(
            'rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant',
          )}
        >
          <strong className={cm.cn('text-on-surface font-semibold')}>
            {t('aiVerdict.action', {}, { defaultValue: 'Action:' })}
          </strong>{' '}
          {props.recommendedAction}
        </div>
      )}

      {(props.modelName || props.createdAt) && (
        <p
          className={cm.cn(
            'text-[11px] text-on-surface-variant border-t border-surface-container pt-3',
          )}
        >
          {props.modelName && <span className={cm.cn('font-mono')}>{props.modelName}</span>}
          {props.modelName && props.createdAt && <span className={cm.cn('mx-2')}>·</span>}
          {props.createdAt && <span>{new Date(props.createdAt).toLocaleString()}</span>}
        </p>
      )}
    </section>
  )
}
