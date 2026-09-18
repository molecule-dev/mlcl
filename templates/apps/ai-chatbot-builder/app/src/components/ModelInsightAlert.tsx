import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface ModelInsightAlertProps {
  insightText: ReactNode
}

export default function ModelInsightAlert({ insightText }: ModelInsightAlertProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      style={{
        backgroundImage: 'linear-gradient(to right, currentColor, transparent)',
        padding: 'calc(6 * 0.25rem)',
        borderRadius: '2rem',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-warning-border)',
      }}
      data-mol-id="model-insight-alert"
    >
      <div
        className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 4))}
        style={{ gap: 'calc(3 * 0.25rem)' }}
        data-mol-id="model-insight-alert-header"
      >
        <div
          className={cm.flex({ align: 'center', justify: 'center' })}
          style={{
            width: '8rem-scaled',
            height: 'calc(8 * 0.25rem)',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--md-sys-color-tertiary-container)',
            color: 'var(--md-sys-color-on-tertiary-container)',
          }}
          data-mol-id="model-insight-alert-icon"
        >
          <span
            style={{
              fontFamily: 'Material Symbols outlined',
              fontSize: '${textSizeToRem($1)}',
              lineHeight: '${textSizeToLineHeight($1)}',
            }}
            data-icon="psychology"
          >
            psychology
          </span>
        </div>
        <h4
          className={cm.fontWeight('bold')}
          style={{
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            textTransform: 'uppercase',
            letterSpacing: 'widest',
            color: 'var(--md-sys-color-tertiary)',
          }}
        >
          {t('model-insight-alert.model-insight', {}, { defaultValue: 'Model Insight' })}
        </h4>
      </div>
      <p
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '1.625',
          color: 'var(--md-sys-color-on-surface)',
        }}
        data-mol-id="model-insight-alert-body"
      >
        {insightText}
      </p>
    </div>
  )
}

export { ModelInsightAlert }
