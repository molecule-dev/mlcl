import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Storage usage meter — flips color from primary → warning → critical as
 * usage crosses 75% / 90% thresholds (per DESIGN.md).
 *
 * Used in two contexts:
 *   - sidebar variant (`compact`) — slim 6px meter under the nav
 *   - storage-page variant (`full`) — 12px meter with eyebrow + headline
 *
 * Translated treatment from personal-finance's progress visualizations —
 * adapted for storage with the cloud-file-manager warning ladder.
 */
export interface NimbusStorageMeterProps {
  /** Bytes used by the user. */
  usedBytes: number
  /** Total bytes available on the user's plan. */
  totalBytes: number
  /** Visual variant — `compact` for sidebar, `full` for the Storage page. */
  variant?: 'compact' | 'full'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function NimbusStorageMeter({
  usedBytes,
  totalBytes,
  variant = 'compact',
}: NimbusStorageMeterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const safeTotal = totalBytes > 0 ? totalBytes : 1
  const percent = Math.min(100, Math.round((usedBytes / safeTotal) * 100))

  const tone = percent >= 90 ? 'critical' : percent >= 75 ? 'warning' : 'normal'

  const fillColor =
    tone === 'critical'
      ? 'bg-error'
      : tone === 'warning'
        ? 'bg-warning'
        : 'bg-gradient-to-r from-primary to-tertiary-container'

  const trackColor = 'bg-surface-container-high'

  if (variant === 'full') {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nimbusStorageMeter.usedLabel', {}, { defaultValue: 'Storage used' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-on-surface tabular-nums',
            )}
          >
            {t(
              'nimbusStorageMeter.usedOfTotal',
              {
                used: formatBytes(usedBytes),
                total: formatBytes(totalBytes),
              },
              { defaultValue: '{{used}} of {{total}}' },
            )}
          </span>
        </div>
        <div className={cm.cn('h-3 rounded-full overflow-hidden', trackColor)}>
          <div
            className={cm.cn('h-full rounded-full transition-all duration-300', fillColor)}
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-label={t('nimbusStorageMeter.ariaLabel', {}, { defaultValue: 'Storage used' })}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nimbusStorageMeter.compactLabel', {}, { defaultValue: 'Storage' })}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-on-surface tabular-nums',
          )}
        >
          {t('nimbusStorageMeter.percentUsed', { percent }, { defaultValue: '{{percent}}%' })}
        </span>
      </div>
      <div className={cm.cn('h-1.5 rounded-full overflow-hidden', trackColor)}>
        <div
          className={cm.cn('h-full rounded-full transition-all duration-300', fillColor)}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-label={t('nimbusStorageMeter.ariaLabel', {}, { defaultValue: 'Storage used' })}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'nimbusStorageMeter.compactSummary',
          {
            used: formatBytes(usedBytes),
            total: formatBytes(totalBytes),
          },
          { defaultValue: '{{used}} of {{total}} used' },
        )}
      </p>
    </div>
  )
}
