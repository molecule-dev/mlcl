import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Refill alert card — pill-coloured icon chip, medication name, days-remaining
 * stat, status pill (urgent / due_soon / fine / requested), pharmacy meta,
 * and an optional pill-shaped Request action.
 *
 * Translated from personal-finance's AccountCard.tsx + crm/StatusPill — the
 * shadow-sm rounded-2xl card shell with a left-border urgency accent comes
 * from AccountCard; the uppercase tracking-widest pill comes from CRM.
 */
export type RefillStatus = 'urgent' | 'due_soon' | 'fine' | 'requested'
export type PillColor = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow'

export interface RefillAlertCardProps {
  medicationName: string
  pillColor: PillColor
  daysRemaining: number
  countRemaining: number
  refillsRemaining: number
  pharmacy: string
  pharmacyPhone?: string
  status: RefillStatus
  onRequest?: () => void
}

const PILL_BG: Record<PillColor, string> = {
  blue: 'var(--color-pill-blue)',
  green: 'var(--color-pill-green)',
  orange: 'var(--color-pill-orange)',
  purple: 'var(--color-pill-purple)',
  pink: 'var(--color-pill-pink)',
  yellow: 'var(--color-pill-yellow)',
}

const STATUS_BORDER: Record<RefillStatus, string> = {
  urgent: 'var(--color-dose-missed)',
  due_soon: 'var(--color-dose-due-soon)',
  fine: 'var(--color-dose-taken)',
  requested: 'var(--color-dose-upcoming)',
}

const STATUS_PILL: Record<RefillStatus, string> = {
  urgent: 'bg-error-container text-on-error-container',
  due_soon: 'bg-warning-container text-on-warning-container',
  fine: 'bg-success-container text-on-success-container',
  requested: 'bg-info-container text-on-info-container',
}

export function RefillAlertCard({
  medicationName,
  pillColor,
  daysRemaining,
  countRemaining,
  refillsRemaining,
  pharmacy,
  pharmacyPhone,
  status,
  onRequest,
}: RefillAlertCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isActionable = status === 'urgent' || status === 'due_soon'

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 5),
        // Row on tablet/desktop; at phone width the four sections (icon,
        // pharmacy block, days stat, status+request) wrap instead of cramming.
        'flex-wrap gap-y-3 rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: STATUS_BORDER[status] }}
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
        style={{ backgroundColor: PILL_BG[pillColor], color: 'white' }}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>medication</span>
      </div>

      <div className={cm.cn(cm.flex1, 'min-w-[140px]')}>
        <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}>
          {medicationName}
        </p>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
          {pharmacyPhone
            ? t(
                'refillAlertCard.pharmacyWithPhone',
                { pharmacy, phone: pharmacyPhone },
                { defaultValue: '{{pharmacy}} · {{phone}}' },
              )
            : pharmacy}
        </p>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'refillAlertCard.refillsRemaining',
            { count: refillsRemaining },
            { defaultValue: '{{count}} refills left on Rx' },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.shrink0, cm.textCenter)}>
        <p
          className={cm.cn(
            cm.textSize('3xl'),
            'font-extrabold tracking-tight',
            status === 'urgent' ? 'text-error' : '',
          )}
        >
          {daysRemaining}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'refillAlertCard.daysAt',
            { count: countRemaining },
            { defaultValue: 'days · {{count}} pills' },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.shrink0, cm.flex({ direction: 'col', gap: 'xs', align: 'end' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'px-3 py-1 text-[10px] uppercase tracking-widest rounded-full',
            STATUS_PILL[status],
          )}
        >
          {t(`refillAlertCard.status.${status}`, {}, { defaultValue: status.replace('_', ' ') })}
        </span>
        {isActionable && onRequest && (
          <button
            type="button"
            onClick={onRequest}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              // 44px floor — refill requests are often made by older adults
              // on phones; sub-40px targets mis-tap.
              'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity min-h-[44px]',
            )}
          >
            {t('refillAlertCard.request', {}, { defaultValue: 'Request' })}
          </button>
        )}
      </div>
    </article>
  )
}

export default RefillAlertCard
