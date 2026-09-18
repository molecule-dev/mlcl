import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface ConversationsLineChartProps {
  activeInterval: 'daily' | 'weekly'
  onIntervalChange: (interval: 'daily' | 'weekly') => void
}

export default function ConversationsLineChart({
  activeInterval,
  onIntervalChange,
}: ConversationsLineChartProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={'lg:col-span-2'}
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
      data-mol-id="line-chart"
    >
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}
        data-mol-id="line-chart-header"
      >
        <div>
          <h4
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-on-surface)',
            }}
          >
            {t('conversations-line-chart.title', {}, { defaultValue: 'Conversations Over Time' })}
          </h4>
          <p
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-outline)',
            }}
          >
            {t(
              'conversations-line-chart.subtitle',
              {},
              { defaultValue: 'Growth trends for the last 30 days' },
            )}
          </p>
        </div>
        <div
          className={cm.flex()}
          style={{ gap: 'calc(2 * 0.25rem)' }}
          data-mol-id="interval-toggle"
        >
          <button
            className={
              activeInterval === 'daily'
                ? 'px-4 py-1.5 text-xs font-bold rounded-full bg-primary text-white'
                : 'px-4 py-1.5 text-xs font-bold rounded-full text-outline hover:bg-surface-container transition-colors'
            }
            onClick={() => onIntervalChange('daily')}
            data-mol-id="interval-daily"
          >
            {t('conversations-line-chart.daily', {}, { defaultValue: 'Daily' })}
          </button>
          <button
            className={
              activeInterval === 'weekly'
                ? 'px-4 py-1.5 text-xs font-bold rounded-full bg-primary text-white'
                : 'px-4 py-1.5 text-xs font-bold rounded-full text-outline hover:bg-surface-container transition-colors'
            }
            onClick={() => onIntervalChange('weekly')}
            data-mol-id="interval-weekly"
          >
            {t('conversations-line-chart.weekly', {}, { defaultValue: 'Weekly' })}
          </button>
        </div>
      </div>
      <div
        className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mt', 4))}
        style={{
          position: 'relative',
          height: '300px',
          width: '100%',
          gap: 'calc(1 * 0.25rem)',
          overflow: 'hidden',
          paddingLeft: 'calc(2 * 0.25rem)',
          paddingRight: 'calc(2 * 0.25rem)',
        }}
        data-mol-id="chart-area"
      >
        <svg
          style={{
            position: 'absolute',
            inset: 'calc(0 * 0.25rem)',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
          }}
          preserveAspectRatio="none"
          viewBox="0 0 1000 300"
        >
          <defs>
            <linearGradient id="gradient-line" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop
                offset="0%"
                style={{
                  stopColor: 'color-mix(in srgb, var(--color-chart-primary) 20%, transparent)',
                  stopOpacity: 1,
                }}
              />
              <stop
                offset="100%"
                style={{
                  stopColor: 'color-mix(in srgb, var(--color-chart-primary) 0%, transparent)',
                  stopOpacity: 1,
                }}
              />
            </linearGradient>
          </defs>
          <path
            d="M0,250 Q100,220 200,240 T400,180 T600,210 T800,100 T1000,130 L1000,300 L0,300 Z"
            fill="url(#gradient-line)"
          />
          <path
            d="M0,250 Q100,220 200,240 T400,180 T600,210 T800,100 T1000,130"
            fill="none"
            stroke="var(--color-chart-primary)"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
        <div
          className={cm.flex({ direction: 'col', justify: 'between' })}
          style={{
            position: 'absolute',
            inset: 'calc(0 * 0.25rem)',
            padding: 'calc(2 * 0.25rem)',
            pointerEvents: 'none',
            opacity: 'calc(20 / 100)',
          }}
        >
          <div
            style={{
              borderTopWidth: '1px',
              borderColor: 'var(--md-sys-color-outline)',
              height: '1px',
              width: '100%',
            }}
          ></div>
          <div
            style={{
              borderTopWidth: '1px',
              borderColor: 'var(--md-sys-color-outline)',
              height: '1px',
              width: '100%',
            }}
          ></div>
          <div
            style={{
              borderTopWidth: '1px',
              borderColor: 'var(--md-sys-color-outline)',
              height: '1px',
              width: '100%',
            }}
          ></div>
          <div
            style={{
              borderTopWidth: '1px',
              borderColor: 'var(--md-sys-color-outline)',
              height: '1px',
              width: '100%',
            }}
          ></div>
        </div>
      </div>
      <div
        className={cm.cn(cm.flex({ justify: 'between' }), cm.sp('mt', 4), cm.fontWeight('bold'))}
        style={{
          paddingLeft: 'calc(2 * 0.25rem)',
          paddingRight: 'calc(2 * 0.25rem)',
          fontSize: '10px',
          color: 'color-mix(in srgb, var(--md-sys-color-outline) 60%, transparent)',
          letterSpacing: 'widest',
          textTransform: 'uppercase',
        }}
        data-mol-id="chart-labels"
      >
        <span>{t('conversations-line-chart.day-1', {}, { defaultValue: 'Day 1' })}</span>
        <span>{t('conversations-line-chart.day-10', {}, { defaultValue: 'Day 10' })}</span>
        <span>{t('conversations-line-chart.day-20', {}, { defaultValue: 'Day 20' })}</span>
        <span>{t('conversations-line-chart.day-30', {}, { defaultValue: 'Day 30' })}</span>
      </div>
    </div>
  )
}

export { ConversationsLineChart }
