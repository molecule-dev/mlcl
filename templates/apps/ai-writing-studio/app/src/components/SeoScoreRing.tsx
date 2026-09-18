import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Circular SEO-score gauge — inline SVG with a track + foreground arc
 * sized to `score / 100`. Color tier (excellent/good/fair/poor) is derived
 * from the DESIGN.md SEO palette. Used on the SEOAnalysis page header
 * and in the right-rail preview on Editor.
 *
 * Bespoke — no direct sibling, modeled after the SVG sparkline pattern
 * in personal-finance/NetWorthCard but rendered as a closed arc.
 */
export interface SeoScoreRingProps {
  /** 0-100 SEO score. Values are clamped to that range. */
  score: number
  /** Optional caption (e.g. "Overall"). */
  captionKey?: string
  captionDefault?: string
  /** Pixel size of the ring. Defaults to 96. */
  size?: number
}

function tierFor(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'EXCELLENT', color: 'var(--color-success, #059669)' }
  if (score >= 60) return { label: 'GOOD', color: 'var(--color-info, #16a34a)' }
  if (score >= 40) return { label: 'FAIR', color: 'var(--color-secondary, #e8a830)' }
  return { label: 'POOR', color: 'var(--color-error, #dc2626)' }
}

export function SeoScoreRing({ score, captionKey, captionDefault, size = 96 }: SeoScoreRingProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const clamped = Math.max(0, Math.min(100, score))
  const tier = tierFor(clamped)
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (clamped / 100) * circumference
  const center = size / 2
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="var(--color-surface-container, #f4f2f8)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={tier.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
        <div className={cm.cn('absolute inset-0 flex items-center justify-center')}>
          <span className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
            {clamped}
          </span>
        </div>
      </div>
      {captionKey ? (
        <span
          className={cm.cn(cm.fontWeight('bold'), 'text-[10px] uppercase tracking-widest')}
          style={{ color: tier.color }}
        >
          {t(captionKey, {}, { defaultValue: captionDefault ?? tier.label })}
        </span>
      ) : null}
    </div>
  )
}

export default SeoScoreRing
