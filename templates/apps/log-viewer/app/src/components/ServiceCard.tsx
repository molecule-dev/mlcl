import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LogVolumeSparkline } from './LogVolumeSparkline.js'

/**
 * Service catalog card — observability-flavoured panel with a coloured
 * header pill (health), big mono-extrabold ingest rate, error-rate sparkline
 * across the bottom edge, and an owner team badge.
 *
 * Translated from status-page's StatusOverviewCard hover-lift treatment +
 * ci-cd-dashboard's MetricStatCard typography. Recoloured to severity
 * health states (healthy / degraded / down) per DESIGN.md.
 */

export type ServiceHealth = 'healthy' | 'degraded' | 'down' | 'maintenance'

export interface ServiceCardData {
  id: string
  name: string
  description: string
  owner_team: string
  health: ServiceHealth
  log_rate_per_min: number
  error_rate_pct: number
  recent_volume: number[]
}

interface ServiceCardProps {
  service: ServiceCardData
  onSelect?: () => void
}

const HEALTH_TINT: Record<
  ServiceHealth,
  { dot: string; bg: string; text: string; sparkStroke: string; defaultLabel: string }
> = {
  healthy: {
    dot: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 16%, transparent)',
    text: 'var(--color-success-light)',
    sparkStroke: 'var(--color-success)',
    defaultLabel: 'Healthy',
  },
  degraded: {
    dot: 'var(--color-severity-warn)',
    bg: 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
    text: 'var(--color-severity-warn-light)',
    sparkStroke: 'var(--color-severity-warn)',
    defaultLabel: 'Degraded',
  },
  down: {
    dot: 'var(--color-severity-fatal)',
    bg: 'color-mix(in srgb, var(--color-severity-fatal) 16%, transparent)',
    text: 'var(--color-severity-fatal-light)',
    sparkStroke: 'var(--color-severity-fatal)',
    defaultLabel: 'Down',
  },
  maintenance: {
    dot: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
    text: 'var(--color-accent-hover)',
    sparkStroke: 'var(--color-accent)',
    defaultLabel: 'Maintenance',
  },
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = HEALTH_TINT[service.health]
  const errorTone =
    service.error_rate_pct >= 5
      ? 'var(--color-severity-fatal-light)'
      : service.error_rate_pct >= 1
        ? 'var(--color-severity-warn-light)'
        : 'var(--color-success-light)'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={cm.cn(
        'group relative w-full text-left rounded-2xl p-5 transition-all',
        onSelect && 'hover:-translate-y-0.5 hover:shadow-xl cursor-pointer',
      )}
      style={{
        backgroundColor: 'var(--color-surface-container)',
        border: '1px solid var(--color-border)',
      }}
      data-mol-id={`service-card-${service.id}`}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
          )}
          style={{ backgroundColor: tint.bg, color: tint.text }}
        >
          <span
            className={cm.cn('inline-block h-1.5 w-1.5 rounded-full')}
            style={{ backgroundColor: tint.dot }}
            aria-hidden="true"
          />
          {t(`serviceCard.health.${service.health}`, {}, { defaultValue: tint.defaultLabel })}
        </span>
        <span
          className={cm.cn('font-mono text-[10px] font-bold uppercase tracking-widest')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {service.owner_team}
        </span>
      </div>

      <h3 className={cm.cn('mt-3 font-mono text-base font-bold text-on-surface truncate')}>
        {service.name}
      </h3>
      <p className={cm.cn('mt-1 text-xs text-on-surface-variant line-clamp-2')}>
        {service.description}
      </p>

      <div className={cm.cn('mt-4 flex items-end justify-between gap-3')}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('serviceCard.ingestRate', {}, { defaultValue: 'Logs / min' })}
          </p>
          <p
            className={cm.cn('font-mono text-2xl font-extrabold tracking-tighter text-on-surface')}
          >
            {service.log_rate_per_min.toLocaleString()}
          </p>
        </div>
        <div className={cm.cn('text-right')}>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('serviceCard.errorRate', {}, { defaultValue: 'Error %' })}
          </p>
          <p className={cm.cn('font-mono text-lg font-extrabold')} style={{ color: errorTone }}>
            {service.error_rate_pct.toFixed(2)}%
          </p>
        </div>
      </div>

      {service.recent_volume.length > 1 ? (
        <div className={cm.cn('mt-3')}>
          <LogVolumeSparkline
            values={service.recent_volume}
            width={240}
            height={36}
            stroke={tint.sparkStroke}
            ariaLabel={t(
              'serviceCard.recentSpark',
              { name: service.name },
              { defaultValue: 'Recent log volume for {{name}}' },
            )}
          />
        </div>
      ) : null}
    </button>
  )
}
