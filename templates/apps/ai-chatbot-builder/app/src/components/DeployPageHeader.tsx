import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface DeployPageHeaderProps {
  title: string
  subtitle: string
}

export default function DeployPageHeader({ title, subtitle }: DeployPageHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.sp('mb', 12)} data-mol-id="deploy-page-header">
      <div
        className={cm.cn(cm.flex({ align: 'center' }), cm.fontWeight('bold'), cm.sp('mb', 4))}
        style={{
          gap: 'calc(3 * 0.25rem)',
          color: 'var(--md-sys-color-primary)',
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
        }}
        data-mol-id="go-live-label"
      >
        <span
          style={{
            fontFamily: 'Material Symbols outlined',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
          }}
        >
          rocket_launch
        </span>
        <span style={{ letterSpacing: 'widest', textTransform: 'uppercase' }}>
          {t('deploy-page-header.go-live', {}, { defaultValue: 'Go Live' })}
        </span>
      </div>
      <h1
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4))}
        style={{
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          fontFamily: 'var(--font-headline, sans-serif)',
          color: 'var(--md-sys-color-on-surface)',
          letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
        }}
        data-mol-id="deploy-title"
      >
        {title}
      </h1>
      <p
        style={{
          color: 'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 70%, transparent)',
          fontSize: '${textSizeToRem($1)}',
          lineHeight: '${textSizeToLineHeight($1)}',
          maxWidth: '42rem',
        }}
        data-mol-id="deploy-subtitle"
      >
        {subtitle}
      </p>
    </div>
  )
}

export { DeployPageHeader }
