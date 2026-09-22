import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 * Triad of summary stat cards — uppercase eyebrow, large extrabold value, optional
 * trend indicator, and a 4px colored left border accent. Used at the top of the
 * Dashboard, Checklist, and Documents pages.
 *
 * Translated from crm/Dashboard.tsx KPI grid + personal-finance/DashboardAccountOverview.tsx
 * — adapted to Embark's "Stat Card" spec from DESIGN.md.
 */

export interface StatTriadItem {
  /** Unique key for React. */
  id: string
  /** Uppercase eyebrow label (e.g. "Tasks"). */
  label: string
  /** Primary numeric or short text value (e.g. "12 / 18"). */
  value: ReactNode
  /** Optional helper text under the value. */
  helper?: ReactNode
  /** Hex accent color for the left border + helper text. */
  accent?: string
  /** Optional Material Symbol icon glyph name. */
  icon?: string
  /** Optional trend pill (e.g. "+3 today"). */
  trend?: { label: string; positive?: boolean }
}

export interface StatTriadProps {
  items: StatTriadItem[]
}

export function StatTriad({ items }: StatTriadProps) {
  const cm = getClassMap()

  return (
    <div
      className={cm.cn(cm.sp('mb', 8), 'eo-triad')}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        gap: '20px',
      }}
    >
      {items.map((item) => {
        const accent = item.accent ?? '#0f766e'
        return (
          <article
            key={item.id}
            data-mol-id={`stat-${item.id}`}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'transition-transform duration-200 hover:-translate-y-0.5',
            )}
            style={{
              background: 'var(--color-surface, var(--mol-color-surface))',
              padding: '20px 24px',
              borderRadius: '14px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
              borderLeft: `4px solid ${accent}`,
            }}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{
                  color: 'var(--color-foreground-secondary, var(--mol-color-text-secondary))',
                }}
              >
                {item.label}
              </p>
              {item.icon && (
                <span
                  className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '999px',
                    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                    // Same rule as the trend pill: darken the accent for
                    // glyphs on its own 14% tint (raw mid-tone accents ~3:1).
                    color: `color-mix(in srgb, ${accent} 70%, black)`,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {item.icon}
                  </span>
                </span>
              )}
            </div>
            <p
              className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2))}
              style={{
                fontSize: '30px',
                lineHeight: 1.05,
                color: 'var(--color-foreground, #0f172a)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.value}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('mt', 2),
              )}
            >
              {item.helper && (
                <span className={cm.cn(cm.textMuted, 'text-xs')} style={{ flex: 1, minWidth: 0 }}>
                  {item.helper}
                </span>
              )}
              {item.trend && (
                <span
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{
                    // Text on a 14%-tint of its own accent needs a darker stop
                    // than the raw accent (mid-tone accents only reach ~3:1);
                    // mixing 30% black in guarantees >=4.5:1 for any accent.
                    color:
                      item.trend.positive === false
                        ? 'var(--mol-color-error)'
                        : `color-mix(in srgb, ${accent} 70%, black)`,
                    background:
                      item.trend.positive === false
                        ? 'rgba(220, 38, 38, 0.10)'
                        : `color-mix(in srgb, ${accent} 14%, transparent)`,
                    padding: '2px 10px',
                    borderRadius: '999px',
                    flexShrink: 0,
                  }}
                >
                  {item.trend.label}
                </span>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
