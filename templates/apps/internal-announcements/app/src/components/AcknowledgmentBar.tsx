/**
 * AcknowledgmentBar — first-class progress bar showing how many recipients
 * have acknowledged an announcement.
 *
 * Layout: track + filled bar in `--color-acknowledged`, uppercase 10px label
 * row above ("X of Y acknowledged"). Per DESIGN.md, acknowledgment is
 * explicit and visible — never buried in a menu.
 *
 * Translated from personal-finance/AccountCard progress-bar treatment fused
 * with crm/StatsRow uppercase tracking-widest label.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AcknowledgmentBarProps {
  acknowledged: number
  total: number
  /** Optional compact variant — drops the heading row for inline placement. */
  compact?: boolean
}

export function AcknowledgmentBar({
  acknowledged,
  total,
  compact = false,
}: AcknowledgmentBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = total > 0 ? Math.min(100, Math.round((acknowledged / total) * 100)) : 0

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'w-full')}>
      {!compact && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span
              className={cm.cn('material-symbols-outlined text-base')}
              style={{ color: 'var(--color-acknowledged, var(--color-acknowledged))' }}
              aria-hidden="true"
            >
              task_alt
            </span>
            {t(
              'acknowledgmentBar.label',
              { acknowledged, total },
              { defaultValue: '{{acknowledged}} of {{total}} acknowledged' },
            )}
          </span>
          <span
            className={cm.cn('tabular-nums')}
            style={{ color: 'var(--color-acknowledged, var(--color-acknowledged))' }}
          >
            {pct}%
          </span>
        </div>
      )}
      <div
        className={cm.cn(cm.w('full'), 'h-[6px] rounded-full overflow-hidden bg-surface-container')}
        role="progressbar"
        aria-label={t(
          'acknowledgmentBar.label',
          { acknowledged, total },
          { defaultValue: '{{acknowledged}} of {{total}} acknowledged' },
        )}
        aria-valuenow={acknowledged}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className={cm.cn(cm.h('full'), 'rounded-full transition-all')}
          style={{
            width: `${pct}%`,
            backgroundColor: 'var(--color-acknowledged, var(--color-acknowledged))',
          }}
        />
      </div>
    </div>
  )
}

export default AcknowledgmentBar
