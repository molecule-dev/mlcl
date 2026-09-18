/**
 * Gradient hero card — total runs in 6xl-extrabold, frosted-glass change pill,
 * decorative blurred orbs, inline SVG sparkline of run volume.
 *
 * Translated from personal-finance's NetWorthCard.tsx, retuned to Dendrite's
 * violet→cyan gradient with run-volume sparkline.
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface WorkflowHeroCardProps {
  /** Headline value (e.g. "12.4k runs today") — pre-formatted. */
  value: ReactNode
  label: string
  /** Frosted-glass change pill (e.g. "+18% vs yesterday"). */
  change?: { value: string; direction: 'up' | 'down' }
  /** Sparkline series of recent run-volume samples (0–N). */
  sparkline?: number[]
  /** Footer KPI quartet under the value. */
  kpis?: Array<{ label: string; value: string }>
}

export function WorkflowHeroCard({ value, label, change, sparkline, kpis }: WorkflowHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Build SVG sparkline path
  const points = sparkline ?? []
  const max = Math.max(1, ...points)
  const sparkPath = points.length
    ? points
        .map((v, i) => {
          const x = (i / Math.max(1, points.length - 1)) * 320
          const y = 60 - (v / max) * 50
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
    : ''
  const fillPath = sparkPath ? `${sparkPath} L320,60 L0,60 Z` : ''

  return (
    <div
      className={'rounded-[2rem] p-8 md:p-10 relative overflow-hidden text-white shadow-xl'}
      style={{
        background:
          'linear-gradient(135deg, var(--color-node-trigger) 0%, var(--color-accent-violet) 50%, var(--color-node-condition) 100%)',
        boxShadow: '0 20px 50px color-mix(in srgb, var(--color-accent-violet) 35%, transparent)',
      }}
    >
      {/* Decorative orbs */}
      <div
        className={
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full blur-3xl pointer-events-none'
        }
        style={{ background: 'color-mix(in srgb, var(--color-node-condition) 35%, transparent)' }}
        aria-hidden
      />
      <div
        className={'absolute -left-20 -top-20 w-72 h-72 rounded-full blur-3xl pointer-events-none'}
        style={{ background: 'color-mix(in srgb, white 18%, transparent)' }}
        aria-hidden
      />

      <div className="relative z-10">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest',
          )}
          style={{ color: 'color-mix(in srgb, var(--color-sidebar-text) 90%, transparent)' }}
        >
          <span
            className={'material-symbols-outlined text-sm'}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
          {label}
        </div>

        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <div className={'text-5xl md:text-6xl font-extrabold tracking-tighter leading-none'}>
            {value}
          </div>
          {change && (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full backdrop-blur-md',
              )}
              style={{ background: 'color-mix(in srgb, white 20%, transparent)' }}
            >
              <span className={'material-symbols-outlined text-base'}>
                {change.direction === 'up' ? 'trending_up' : 'trending_down'}
              </span>
              {change.value}
            </span>
          )}
        </div>

        {/* Sparkline */}
        {sparkPath && (
          <div className={'relative h-16 mt-6 -mx-2'}>
            <svg viewBox="0 0 320 60" className={'w-full h-full'} preserveAspectRatio="none">
              <path d={fillPath} fill="color-mix(in srgb, white 20%, transparent)" />
              <path
                d={sparkPath}
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className={cm.cn(
                'absolute right-0 -top-4 text-[10px] uppercase tracking-widest font-bold',
              )}
              style={{ color: 'color-mix(in srgb, var(--color-sidebar-text) 80%, transparent)' }}
            >
              {t('workflowHeroCard.last24h', {}, { defaultValue: 'Last 24 h' })}
            </div>
          </div>
        )}

        {/* KPI quartet */}
        {kpis && kpis.length > 0 && (
          <div
            className={cm.cn('grid gap-4 mt-6')}
            style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}
          >
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className={cm.cn(cm.sp('p', 3), 'rounded-xl backdrop-blur-md')}
                style={{ background: 'color-mix(in srgb, white 12%, transparent)' }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: 'color-mix(in srgb, var(--color-sidebar-text) 85%, transparent)',
                  }}
                >
                  {kpi.label}
                </div>
                <div className={'text-xl font-extrabold tracking-tight mt-1'}>{kpi.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
