import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface HealthMetric {
  label: string
  value: number
  unit?: string
}

interface SystemHealthPanelProps {
  metrics: HealthMetric[]
}

export default function SystemHealthPanel({ metrics }: SystemHealthPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      style={{
        backgroundImage: 'linear-gradient(to br, var(--tw-gradient-from), var(--tw-gradient-to))',
        padding: 'calc(6 * 0.25rem)',
        borderRadius: '0.75rem',
        color: 'var(--color-on-error)',
        boxShadow: 'var(--tw-shadow-lg, revert)',
      }}
      data-mol-id="system-health-panel"
    >
      <div
        className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 4))}
        style={{ gap: 'calc(2 * 0.25rem)' }}
        data-mol-id="system-health-header"
      >
        <span style={{ fontFamily: 'Material Symbols outlined' }}>auto_awesome</span>
        <span
          className={cm.fontWeight('bold')}
          style={{ fontSize: '${textSizeToRem($1)}', lineHeight: '${textSizeToLineHeight($1)}' }}
        >
          {t('system-health-panel.title', {}, { defaultValue: 'System Health' })}
        </span>
      </div>
      <div style={{ rowGap: '4*0.25rem' }} data-mol-id="system-health-metrics">
        {metrics.map((metric, index) => (
          <div key={index} data-mol-id={`system-health-metric-${index}`}>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
              )}
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: 'widest',
                opacity: 'calc(80 / 100)',
              }}
            >
              <span>{metric.label}</span>
              <span>
                {metric.value}
                {metric.unit ?? ''}
              </span>
            </div>
            <div
              className={cm.roundedFull}
              style={{
                height: 'calc(1 * 0.25rem)',
                backgroundColor: 'color-mix(in srgb, var(--md-sys-color-white) 20%, transparent)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(Math.max(metric.value, 0), 100)}%`,
                  backgroundColor: 'var(--color-on-error)',
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { SystemHealthPanel }
