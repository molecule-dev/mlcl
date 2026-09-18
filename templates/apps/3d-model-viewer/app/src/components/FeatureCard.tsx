import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FeatureCardProps {
  icon?: string
  title?: string
  description?: string
}

function FeatureCard({
  icon = 'view_in_ar',
  title: titleProp,
  description: descProp,
}: FeatureCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const title = titleProp ?? t('featureCard.title', {}, { defaultValue: 'Immersive viewer' })
  const description =
    descProp ??
    t(
      'featureCard.description',
      {},
      {
        defaultValue:
          'Lightning-fast WebGL rendering that handles complex millions of polygons with buttery smooth 60fps performance.',
      },
    )
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-low ghost-border rounded-xl hover:bg-surface-container transition-colors duration-300',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(12),
          cm.h(12),
          cm.sp('mb', 6),
          cm.textPrimary,
          'bg-primary-fixed rounded-xl',
        )}
      >
        <span className="material-symbols-outlined" data-weight="fill">
          {icon}
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'text-on-surface',
        )}
      >
        {title}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
        {description}
      </p>
    </div>
  )
}

export default FeatureCard
export { FeatureCard }
