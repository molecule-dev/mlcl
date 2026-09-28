import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Medication card — pill-coloured icon chip, drug name, dosage in
 * clinical font, frequency, refill pill (caution / overdue), optional
 * interaction warning triangle.
 *
 * Translated from medication-reminder's RefillAlertCard.tsx — same
 * shadow-sm rounded-2xl card shell with status pill and trailing
 * details, recoloured to Meridian's clinical palette and adding a
 * dosage block in SF Mono per DESIGN.md "Medication dosages: clinical
 * font at sm size".
 */
export type RefillStatus = 'fine' | 'due_soon' | 'overdue' | 'requested'

export interface MedicationCardProps {
  /** Medication id — when present the row links to /medications/:id. */
  id?: string
  /** Drug name, e.g. "Atorvastatin". */
  name: string
  /** Dosage string, e.g. "20 mg" or "1 tablet". */
  dosage: string
  /** Frequency, e.g. "Once daily". */
  frequency: string
  /** Route, e.g. "Oral". */
  route?: string
  /** Prescriber's display name (optional). */
  prescriber?: string
  /** Days until refill is needed (negative = overdue). */
  refillInDays: number
  refillStatus: RefillStatus
  /** Whether this medication has known interactions to surface. */
  hasInteraction?: boolean
}

const REFILL_BG: Record<RefillStatus, string> = {
  fine: 'bg-success-container text-on-success-container',
  due_soon: 'bg-warning-container text-on-warning-container',
  overdue: 'bg-error-container text-on-error-container',
  requested: 'bg-info-container text-on-info-container',
}

const REFILL_BORDER: Record<RefillStatus, string> = {
  fine: 'var(--color-clinical-normal)',
  due_soon: 'var(--color-clinical-caution)',
  overdue: 'var(--color-clinical-overdue)',
  requested: 'var(--color-secondary)',
}

export function MedicationCard({
  id,
  name,
  dosage,
  frequency,
  route,
  prescriber,
  refillInDays,
  refillStatus,
  hasInteraction,
}: MedicationCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const inner = (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={{ ['--mol-accent' as string]: REFILL_BORDER[refillStatus] }}
    >
      <div
        className={cm.cn(
          cm.shrink0,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.h(14),
          cm.w(14),
          cm.roundedFull,
          'shadow-sm',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-perm-owner), var(--mol-color-primary-light))',
          color: 'white',
        }}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>medication</span>
      </div>

      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}>{name}</p>
          {hasInteraction && (
            <span
              className={cm.cn('material-symbols-outlined text-base')}
              style={{ color: 'var(--color-clinical-abnormal)' }}
              aria-label={t(
                'medicationCard.interactionWarning',
                {},
                { defaultValue: 'Interaction warning' },
              )}
              title={t(
                'medicationCard.interactionWarning',
                {},
                { defaultValue: 'Interaction warning' },
              )}
            >
              warning
            </span>
          )}
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}
          style={{ fontFamily: 'var(--mol-font-mono)' }}
        >
          {t(
            'medicationCard.dosage',
            { dosage, frequency },
            { defaultValue: '{{dosage}} · {{frequency}}' },
          )}
        </p>
        {(prescriber || route) && (
          <p
            className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant truncate')}
          >
            {prescriber && route
              ? t(
                  'medicationCard.meta',
                  { prescriber, route },
                  { defaultValue: '{{prescriber}} · {{route}}' },
                )
              : prescriber || route}
          </p>
        )}
      </div>

      <div className={cm.cn(cm.shrink0, cm.flex({ direction: 'col', align: 'end', gap: 'xs' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
            REFILL_BG[refillStatus],
          )}
        >
          {refillStatus === 'overdue'
            ? t(
                'medicationCard.refill.overdue',
                { days: Math.abs(refillInDays) },
                { defaultValue: 'Overdue · {{days}}d' },
              )
            : refillStatus === 'due_soon'
              ? t(
                  'medicationCard.refill.dueSoon',
                  { days: refillInDays },
                  { defaultValue: 'Refill in {{days}}d' },
                )
              : refillStatus === 'requested'
                ? t('medicationCard.refill.requested', {}, { defaultValue: 'Refill requested' })
                : t(
                    'medicationCard.refill.fine',
                    { days: refillInDays },
                    { defaultValue: '{{days}}d supply' },
                  )}
        </span>
      </div>
    </article>
  )

  return id ? (
    <Link to={`/medications/${id}`} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default MedicationCard
