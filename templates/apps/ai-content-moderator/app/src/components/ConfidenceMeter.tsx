import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ConfidenceMeterProps {
  /** Confidence value in [0, 1]. */
  value: number
  /** Show numeric label (default: true). */
  showLabel?: boolean
  /** Compact (table) vs roomy (detail) variant. */
  variant?: 'compact' | 'detail'
}

/**
 * AI-confidence meter — gradient fill where the gradient endpoint is
 * controlled by confidence value (low → red, mid → amber, high → emerald).
 */
export function ConfidenceMeter({
  value,
  showLabel = true,
  variant = 'compact',
}: ConfidenceMeterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(1, value)) * 100
  const tint = pct < 40 ? '#dc2626' : pct < 75 ? '#d97706' : '#16a34a'
  const trackHeight = variant === 'detail' ? 'h-2' : 'h-1.5'
  const labelClass =
    variant === 'detail'
      ? 'text-sm font-bold text-on-surface tabular-nums mt-1'
      : 'text-[10px] text-on-surface-variant mt-1 tabular-nums text-center'
  return (
    <div className={cm.cn(cm.w('full'))}>
      <div
        className={cm.cn(
          cm.w('full'),
          trackHeight,
          'bg-surface-container-high rounded-full overflow-hidden',
        )}
        role="progressbar"
        aria-label={t('queue.aiConfidence', {}, { defaultValue: 'AI confidence' })}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cm.cn('h-full rounded-full transition-[width] duration-300')}
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #dc2626 0%, #d97706 50%, ${tint} 100%)`,
          }}
        />
      </div>
      {showLabel && <div className={labelClass}>{Math.round(pct)}%</div>}
    </div>
  )
}
