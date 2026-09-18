import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vertical timeline of shipment events. Left-aligned status dots
 * connected by a dashed/solid spine; completed steps render an emerald
 * dot with a checkmark, in-flight steps render the brand-orange dot,
 * upcoming steps render an outlined dot.
 *
 * Translated from project-management/EventItem + crm/ActivitiesTimelineFeed
 * (avatar-replaced-by-status-dot pattern, §3.2) and DESIGN.md Shipment
 * Tracker spec (4-state dot palette, dashed connecting lines, dated step
 * captions).
 */
export type ShipmentStepStatus = 'completed' | 'current' | 'upcoming'

export interface ShipmentStep {
  id: string
  title: string
  description: string
  date: string
  status: ShipmentStepStatus
  carrier?: string
  trackingNumber?: string
}

const dotStyles: Record<ShipmentStepStatus, string> = {
  completed: 'bg-success border-success text-on-success',
  current: 'bg-primary border-primary text-on-primary animate-pulse',
  upcoming: 'bg-surface-container-lowest border-outline-variant text-outline-variant',
}

const stepIcons: Record<ShipmentStepStatus, string> = {
  completed: 'check',
  current: 'local_shipping',
  upcoming: 'pending',
}

export function ShipmentTimeline({ steps }: { steps: ShipmentStep[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ol className={cm.cn(cm.flex({ direction: 'col' }), 'relative')}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1
        const lineClass =
          step.status === 'completed' || step.status === 'current'
            ? 'bg-success/40'
            : 'bg-outline-variant/40 [background-image:linear-gradient(to_bottom,transparent_50%,currentColor_50%)] [background-size:2px_8px]'
        return (
          <li key={step.id} className={cm.cn('relative pl-12 pb-8 last:pb-0')}>
            {!isLast && (
              <span
                aria-hidden="true"
                className={cm.cn('absolute left-[14px] top-8 bottom-0 w-0.5', lineClass)}
              />
            )}
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute left-0 top-0 w-8 h-8 rounded-full border-2 shadow-sm',
                dotStyles[step.status],
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-sm')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {stepIcons[step.status]}
              </span>
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'sm' }))}>
                <h3 className={cm.cn('text-base font-bold tracking-tight text-on-surface')}>
                  {step.title}
                </h3>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 0),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'text-[10px] uppercase tracking-widest',
                    step.status === 'completed'
                      ? 'bg-success-light text-success'
                      : step.status === 'current'
                        ? 'bg-primary-fixed/30 text-primary'
                        : 'bg-surface-container-low text-on-surface-variant',
                  )}
                >
                  {t(
                    `shipmentTimeline.status.${step.status}`,
                    {},
                    {
                      defaultValue:
                        step.status === 'completed'
                          ? 'Done'
                          : step.status === 'current'
                            ? 'In transit'
                            : 'Upcoming',
                    },
                  )}
                </span>
              </div>
              <p className={cm.cn('text-sm text-on-surface-variant max-w-xl')}>
                {step.description}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', wrap: 'wrap', gap: 'md' }),
                  cm.sp('mt', 1),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'text-xs font-bold text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    calendar_month
                  </span>
                  {step.date}
                </span>
                {step.carrier && (
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'text-xs font-bold text-on-surface-variant',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>
                      local_shipping
                    </span>
                    {step.carrier}
                  </span>
                )}
                {step.trackingNumber && (
                  <span className={cm.cn('text-xs font-mono font-bold text-primary')}>
                    {step.trackingNumber}
                  </span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default ShipmentTimeline
