/**
 * KPI tile — left-border accent, uppercase tracking-widest label, extrabold
 * tabular value, subtle hover lift. Used across Dashboard / Budget summary
 * rails.
 *
 * Translated from personal-finance's KPI/SavingsRateCard treatment — same
 * label cap + extrabold-numeric pattern, simplified for envelope semantics
 * (Income / Assigned / Spent / Available / Overspent).
 */

import { useTranslation } from '@molecule/app-react'
import type { AccentTone } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

export type EnvelopeKpiTone =
  'income' | 'assigned' | 'spent' | 'available' | 'overspent' | 'neutral'

interface EnvelopeKpiCardProps {
  label: string
  value: string
  tone?: EnvelopeKpiTone
  caption?: string
  icon?: string
}

function toneStyles(tone: EnvelopeKpiTone): {
  tone: AccentTone
  accent?: string
  valueText: string
  iconBg: string
  iconText: string
} {
  switch (tone) {
    case 'income':
      return {
        tone: 'success',
        valueText: 'text-success',
        iconBg: 'bg-success/10',
        iconText: 'text-success',
      }
    case 'assigned':
      return {
        tone: 'primary',
        valueText: 'text-primary',
        iconBg: 'bg-primary/10',
        iconText: 'text-primary',
      }
    case 'spent':
      return {
        tone: 'default',
        valueText: 'text-on-surface',
        iconBg: 'bg-on-surface/10',
        iconText: 'text-on-surface',
      }
    case 'available':
      return {
        tone: 'custom',
        accent: 'var(--color-secondary)',
        valueText: 'text-secondary',
        iconBg: 'bg-secondary/10',
        iconText: 'text-secondary',
      }
    case 'overspent':
      return {
        tone: 'error',
        valueText: 'text-error',
        iconBg: 'bg-error/10',
        iconText: 'text-error',
      }
    default:
      return {
        tone: 'custom',
        accent: 'var(--color-outline)',
        valueText: 'text-on-surface',
        iconBg: 'bg-surface-container',
        iconText: 'text-on-surface-variant',
      }
  }
}

export function EnvelopeKpiCard({
  label,
  value,
  tone = 'neutral',
  caption,
  icon,
}: EnvelopeKpiCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const styles = toneStyles(tone)
  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: styles.tone }),
        'bg-surface-container-lowest rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={styles.accent ? { ['--mol-accent' as string]: styles.accent } : undefined}
      data-mol-id={`kpi-${tone}`}
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <p className={cm.accentCardLabel({ tone: styles.tone })}>{label}</p>
        {icon ? (
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              styles.iconBg,
              styles.iconText,
            )}
            aria-hidden="true"
          >
            <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>{icon}</span>
          </span>
        ) : null}
      </div>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('extrabold'),
          cm.sp('mt', 2),
          'tabular-nums tracking-tight',
          styles.valueText,
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {caption}
        </p>
      ) : (
        <p
          className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant/60 italic')}
        >
          {t('envelopeKpiCard.captionPlaceholder', {}, { defaultValue: 'this month' })}
        </p>
      )}
    </article>
  )
}
