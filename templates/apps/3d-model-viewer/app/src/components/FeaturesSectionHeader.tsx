import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function FeaturesSectionHeader() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.textCenter, cm.sp('mb', 16), cm.maxW('2xl'), cm.mxAuto)}>
      <h2
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'font-headline text-on-surface',
        )}
      >
        {t('featuresSectionHeader.heading', {}, { defaultValue: 'Crafted for precision' })}
      </h2>
      <p className="text-on-surface-variant font-body">
        {t(
          'featuresSectionHeader.description',
          {},
          {
            defaultValue:
              'Everything you need to review, present, and collaborate on 3D assets in a single, elegant environment.',
          },
        )}
      </p>
    </div>
  )
}

export default FeaturesSectionHeader
export { FeaturesSectionHeader }
