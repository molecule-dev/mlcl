import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Immunization row — vaccine name + dose number badge (filled circle
 * with primary background, inverse text per DESIGN.md "Dose badge:
 * 24px circle, primary background, inverse text") + administered date
 * + status (up-to-date check / overdue badge).
 *
 * Translated from medication-reminder's DoseRow.tsx — same
 * chip + content + status-pill row pattern; the dose-number badge
 * pattern is unique to vaccinations.
 */
export type ImmunizationStatus = 'up_to_date' | 'overdue' | 'in_progress'

export interface ImmunizationRowProps {
  vaccineName: string
  /** Display-formatted administered date, e.g. "Mar 14, 2024". */
  administeredLabel: string
  doseNumber: number
  totalDoses: number
  status: ImmunizationStatus
  manufacturer?: string
}

const STATUS_BG: Record<ImmunizationStatus, string> = {
  up_to_date: 'bg-success-container text-on-success-container',
  in_progress: 'bg-info-container text-on-info-container',
  overdue: 'bg-error-container text-on-error-container',
}

export function ImmunizationRow({
  vaccineName,
  administeredLabel,
  doseNumber,
  totalDoses,
  status,
  manufacturer,
}: ImmunizationRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 5),
        cm.sp('py', 4),
        'rounded-xl hover:bg-surface-container-lowest transition-all',
      )}
    >
      <div
        className={cm.cn(
          cm.shrink0,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(10),
          cm.h(10),
          cm.roundedFull,
          cm.fontWeight('bold'),
          'text-white shadow-sm tabular-nums',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-perm-owner), var(--mol-color-primary-light))',
          fontFamily: 'var(--mol-font-mono)',
        }}
        aria-label={t(
          'immunizationRow.doseLabel',
          { num: doseNumber, total: totalDoses },
          { defaultValue: 'Dose {{num}} of {{total}}' },
        )}
      >
        {doseNumber}
      </div>

      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
          {vaccineName}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
          {manufacturer
            ? t(
                'immunizationRow.metaWithMfr',
                { date: administeredLabel, num: doseNumber, total: totalDoses, mfr: manufacturer },
                { defaultValue: '{{date}} · Dose {{num}} of {{total}} · {{mfr}}' },
              )
            : t(
                'immunizationRow.meta',
                { date: administeredLabel, num: doseNumber, total: totalDoses },
                { defaultValue: '{{date}} · Dose {{num}} of {{total}}' },
              )}
        </p>
      </div>

      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
          STATUS_BG[status],
        )}
      >
        {status === 'up_to_date'
          ? t('immunizationRow.status.up_to_date', {}, { defaultValue: 'Up to date' })
          : status === 'overdue'
            ? t('status.overdue', {}, { defaultValue: 'Overdue' })
            : t('status.inProgress', {}, { defaultValue: 'In progress' })}
      </span>
    </article>
  )
}

export default ImmunizationRow
