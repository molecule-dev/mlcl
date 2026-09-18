import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface HealthMetric {
  label: string
  value: number
  unit?: string
}

interface Props {
  metrics: HealthMetric[]
  onReindex: () => void
}

export default function DatabaseHealthPanel({ metrics, onReindex }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container-low)',
        padding: 'calc(6 * 0.25rem)',
        borderRadius: '2rem',
      }}
      data-mol-id="database-health-panel"
    >
      <h3
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 6))}
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {t('database-health-panel.title', {}, { defaultValue: 'Database Health' })}
      </h3>
      <div style={{ rowGap: '6*0.25rem' }} data-mol-id="metrics-list">
        {metrics.map((metric, index) => (
          <div style={{ rowGap: '2*0.25rem' }} key={index} data-mol-id={`metric-item-${index}`}>
            <div
              className={cm.cn(cm.flex({ justify: 'between' }), cm.fontWeight('semibold'))}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
            >
              <span style={{ color: 'var(--md-sys-color-outline)' }}>{metric.label}</span>
              <span style={{ color: 'var(--md-sys-color-primary)' }}>
                {metric.value}
                {metric.unit ?? '%'}
              </span>
            </div>
            <div
              className={cm.roundedFull}
              style={{
                height: '6px',
                width: '100%',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                overflow: 'hidden',
              }}
            >
              <div
                className={cm.roundedFull}
                style={{
                  height: '100%',
                  width: `${metric.value}%`,
                  backgroundColor: 'var(--md-sys-color-primary)',
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div
        className={cm.sp('mt', 8)}
        style={{
          padding: 'calc(6 * 0.25rem)',
          borderTopWidth: '1px',
          borderColor: 'var(--color-panel-border-medium)',
          color: 'var(--md-sys-color-center)',
        }}
        data-mol-id="reindex-action"
      >
        <button
          className={cm.cn(cm.fontWeight('bold'), 'hover:underline')}
          style={{
            color: 'var(--md-sys-color-primary)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            textTransform: 'uppercase',
            letterSpacing: 'widest',
          }}
          onClick={onReindex}
        >
          {t(
            'database-health-panel.reindex-all-sources',
            {},
            { defaultValue: 'Re-index all sources' },
          )}
        </button>
      </div>
    </div>
  )
}

export { DatabaseHealthPanel }
