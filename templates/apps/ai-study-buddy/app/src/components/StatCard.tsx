import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface StatCardProps {
  label: string
  value: ReactNode
  /** Material symbol icon name shown in a tinted square. */
  icon: string
  /** Tint color for the icon square. Defaults to teal primary. */
  tone?: 'primary' | 'secondary' | 'success' | 'info' | 'warning'
  /** Suffix shown next to the value (e.g. "days", "hrs", "%"). */
  suffix?: string
  /** Optional trend indicator. */
  trend?: { positive: boolean; label: string } | { direction: 'up' | 'down'; value: string }
}

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, { bg: string; fg: string }> = {
  primary: { bg: 'bg-primary-container/20', fg: 'text-primary' },
  secondary: { bg: 'bg-secondary-fixed-dim/30', fg: 'text-secondary' },
  success: { bg: 'bg-success-light/60', fg: 'text-success' },
  info: { bg: 'bg-tertiary-fixed/30', fg: 'text-tertiary' },
  warning: { bg: 'bg-warning-light/60', fg: 'text-warning' },
}

/**
 * KPI card for the dashboard stat grid — tinted icon chip in the top-left,
 * uppercase label, large extrabold value with optional suffix, decorative
 * blurred orb top-right. Hover lift via translate-y.
 */
export function StatCard({ label, value, icon, tone = 'primary', suffix, trend }: StatCardProps) {
  const cm = getClassMap()
  const t = TONE_CLASSES[tone]
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'group relative overflow-hidden rounded-[1.5rem] bg-surface-container-lowest shadow-ambient transition-transform duration-300 hover:-translate-y-1',
      )}
      data-mol-id={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Decorative orb */}
      <div
        className={cm.cn(
          'absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-colors group-hover:opacity-90',
          t.bg,
        )}
        aria-hidden="true"
      />

      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'relative z-10 rounded-xl',
            t.bg,
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', t.fg)}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>
        {trend
          ? (() => {
              const positive = 'positive' in trend ? trend.positive : trend.direction === 'up'
              const label = 'label' in trend ? trend.label : trend.value
              return (
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    'tabular-nums',
                    positive
                      ? 'bg-success-light/60 text-success'
                      : 'bg-error-container text-on-error-container',
                  )}
                >
                  {label}
                </span>
              )
            })()
          : null}
      </div>

      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          cm.sp('mb', 1),
          // tracking-wider, NOT widest: a 9-char label ("INCORRECT") in the
          // 3-up mobile KPI grid clips past overflow-hidden at widest.
          'relative z-10 uppercase tracking-wider text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <h3
        className={cm.cn(
          cm.textSize('3xl'),
          'relative z-10 font-extrabold tabular-nums text-on-surface',
        )}
      >
        {value}
        {suffix ? (
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('medium'),
              'ml-1 text-on-surface-variant',
            )}
          >
            {suffix}
          </span>
        ) : null}
      </h3>
    </div>
  )
}
