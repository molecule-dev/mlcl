import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Intent {
  id: string
  bot_id: string
  name: string
  description: string
  response_template: string
  created_at: string
  updated_at: string
  count?: number
  pct?: number
}

interface TopIntentsSectionProps {
  intents: Intent[]
  onDetailedBreakdown: () => void
}

export default function TopIntentsSection({
  intents,
  onDetailedBreakdown,
}: TopIntentsSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
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
      data-mol-id="intents-section"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 8))}>
        <div>
          <h4
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-on-surface)',
            }}
          >
            {t('top-intents-section.top-intents', {}, { defaultValue: 'Top Intents' })}
          </h4>
          <p
            style={{
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
              color: 'var(--md-sys-color-outline)',
            }}
          >
            {t(
              'top-intents-section.primary-user-needs',
              {},
              { defaultValue: 'Primary user needs identified by AI' },
            )}
          </p>
        </div>
        <button
          className={cm.cn(cm.flex({ align: 'center' }), cm.fontWeight('bold'), 'hover:underline')}
          style={{
            color: 'var(--md-sys-color-primary)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            gap: 'calc(1 * 0.25rem)',
          }}
          onClick={onDetailedBreakdown}
          data-mol-id="detailed-breakdown-btn"
        >
          {t('top-intents-section.detailed-breakdown', {}, { defaultValue: 'Detailed Breakdown' })}{' '}
          <span
            style={{
              fontFamily: 'Material Symbols outlined',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
            }}
          >
            arrow_forward
          </span>
        </button>
      </div>
      <div style={{ rowGap: '6*0.25rem' }} data-mol-id="intents-list">
        {intents.map((intent) => (
          <div
            style={{ rowGap: '2*0.25rem' }}
            key={intent.id}
            data-mol-id={`intent-bar-${intent.id}`}
          >
            <div
              className={cm.cn(cm.flex({ justify: 'between' }), cm.fontWeight('bold'))}
              style={{
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
            >
              <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{intent.name}</span>
              <span style={{ color: 'var(--md-sys-color-outline)' }}>
                {(intent.count ?? 0).toLocaleString()}{' '}
                {t('top-intents-section.requests', {}, { defaultValue: 'requests' })}
              </span>
            </div>
            <div
              className={cm.roundedFull}
              style={{
                height: 'calc(3 * 0.25rem)',
                width: '100%',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                overflow: 'hidden',
              }}
            >
              <div
                className={cm.cn(cm.roundedFull, 'to-primary-container')}
                style={{
                  height: '100%',
                  width: `${intent.pct ?? 0}%`,
                  backgroundImage:
                    'linear-gradient(to right, var(--md-sys-color-primary), var(--md-sys-color-primary-container))',
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { TopIntentsSection }
