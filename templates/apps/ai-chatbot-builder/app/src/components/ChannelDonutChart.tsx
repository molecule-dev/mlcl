import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface ChannelSegment {
  channel: string
  count: number
  pct: number
}

interface Props {
  segments: ChannelSegment[]
}

const SEGMENT_COLORS = ['bg-primary-container', 'bg-tertiary-fixed-dim', 'bg-secondary-container']

export default function ChannelDonutChart({ segments }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.flex({ direction: 'col' })}
      style={{
        backdropFilter: 'blur(16px)',
        backgroundColor: 'var(--color-glass-bg)',
        border: '1px solid var(--color-glass-border-faint)',
        padding: 'calc(8 * 0.25rem)',
        borderRadius: '2rem',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-on-error)',
        boxShadow: 'var(--tw-shadow-sm, revert)',
      }}
      data-mol-id="doughnut-chart"
    >
      <h4
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2))}
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {t(
          'channel-donut-chart.resolution-by-channel',
          {},
          { defaultValue: 'Resolution by Channel' },
        )}
      </h4>
      <p
        className={cm.sp('mb', 10)}
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          color: 'var(--md-sys-color-outline)',
        }}
      >
        {t(
          'channel-donut-chart.usage-distribution',
          {},
          { defaultValue: 'Usage distribution across platforms' },
        )}
      </p>
      <div
        className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.flex1)}
        style={{ position: 'relative' }}
        data-mol-id="donut-visual"
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
          style={{
            width: '48rem-scaled',
            height: 'calc(48 * 0.25rem)',
            borderWidth: '20px',
            borderColor: 'var(--md-sys-color-primary-container)',
            position: 'relative',
          }}
        >
          <div
            className={cm.roundedFull}
            style={{
              position: 'absolute',
              inset: '-20px',
              borderWidth: '20px',
              borderColor: 'var(--md-sys-color-b-transparent)',
              transform: 'rotate(20deg)',
            }}
          ></div>
          <div
            className={cm.roundedFull}
            style={{
              position: 'absolute',
              inset: '-20px',
              borderWidth: '20px',
              borderColor: 'var(--md-sys-color-r-transparent)',
              transform: 'rotate(-60deg)',
            }}
          ></div>
          <div style={{ color: 'var(--md-sys-color-center)' }} data-mol-id="donut-center">
            <span
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              {t('channel-donut-chart.total-pct', {}, { defaultValue: '100%' })}
            </span>
            <p
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                color: 'var(--md-sys-color-outline)',
              }}
            >
              {t('channel-donut-chart.total-active', {}, { defaultValue: 'Total Active' })}
            </p>
          </div>
        </div>
      </div>
      <div className={cm.sp('mt', 10)} style={{ rowGap: '3*0.25rem' }} data-mol-id="channel-legend">
        {segments.map((segment, index) => (
          <div
            key={segment.channel}
            className={cm.flex({ align: 'center', justify: 'between' })}
            style={{ fontSize: '${textSizeToRem($1)}', lineHeight: '${textSizeToLineHeight($1)}' }}
            data-mol-id={`channel-legend-item-${segment.channel.toLowerCase()}`}
          >
            <div className={cm.flex({ align: 'center' })} style={{ gap: 'calc(2 * 0.25rem)' }}>
              <span
                className={`w-3 h-3 rounded-full ${SEGMENT_COLORS[index % SEGMENT_COLORS.length]}`}
              ></span>
              <span
                className={cm.fontWeight('medium')}
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {t(
                  `channel-donut-chart.channel-${segment.channel.toLowerCase()}`,
                  {},
                  { defaultValue: segment.channel },
                )}
              </span>
            </div>
            <span className={cm.fontWeight('bold')}>{segment.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ChannelDonutChart }
