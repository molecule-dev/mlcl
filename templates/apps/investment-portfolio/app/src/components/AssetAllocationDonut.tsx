/**
 * SVG donut chart with center-stamped total + legend grid.
 * Each slice uses the asset's brand color, with hover-lift legend rows.
 *
 * Translated from personal-finance's allocation card visual treatment +
 * the pill list pattern from DashboardAccountOverview.tsx.
 */

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AllocationSlice {
  label: string
  value_cents: number
  pct: number
  color: string
}

interface AssetAllocationDonutProps {
  slices: AllocationSlice[]
  totalCents: number
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown): string {
  const dollars = num(cents) / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}k`
  return `$${dollars.toFixed(0)}`
}

export function AssetAllocationDonut({ slices, totalCents }: AssetAllocationDonutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const safeSlices = (Array.isArray(slices) ? slices : []).map((s) => ({
    label: String(s?.label ?? ''),
    value_cents: num((s as { value_cents?: unknown })?.value_cents),
    pct: num((s as { pct?: unknown })?.pct),
    color: String((s as { color?: unknown })?.color ?? '#94a3b8'),
  }))

  const radius = 60
  const stroke = 22
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const arcs = safeSlices.map((s) => {
    const dash = (s.pct / 100) * circumference
    const segment = {
      key: s.label,
      color: s.color,
      strokeDasharray: `${dash} ${circumference - dash}`,
      strokeDashoffset: -offset,
    }
    offset += dash
    return segment
  })

  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-[2rem] border border-outline-variant/40',
      )}
    >
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('assetAllocationDonut.label', {}, { defaultValue: 'Asset Allocation' })}
        </p>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'text-on-surface',
          )}
        >
          {t('assetAllocationDonut.heading', {}, { defaultValue: 'How your money is invested' })}
        </h3>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex-wrap')}>
        <div className={cm.cn('relative w-[160px] h-[160px] shrink-0')}>
          <svg
            viewBox="0 0 160 160"
            className={cm.cn(cm.w('full'), cm.h('full'), '-rotate-90')}
            aria-hidden="true"
          >
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--color-surface-container, #f1f5f9)"
              strokeWidth={stroke}
            />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={a.strokeDasharray}
                strokeDashoffset={a.strokeDashoffset}
              />
            ))}
          </svg>
          <div
            className={cm.cn(
              'absolute inset-0',
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.total', {}, { defaultValue: 'Total' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'tabular-nums text-on-surface',
              )}
            >
              {fmtUsd(totalCents)}
            </p>
          </div>
        </div>

        <ul className={cm.cn('flex-1 min-w-[220px]', cm.stack(2))}>
          {safeSlices.map((s) => (
            <li
              key={s.label}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-xl hover:bg-surface-container/60 transition-colors',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn('block w-3 h-3 rounded-full shrink-0')}
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface')}
                >
                  {s.label}
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant tabular-nums text-right',
                )}
              >
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                  {s.pct.toFixed(1)}%
                </span>
                <span className={cm.cn('block', cm.textSize('xs'))}>{fmtUsd(s.value_cents)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
