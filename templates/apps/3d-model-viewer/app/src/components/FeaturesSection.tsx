import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import FeatureCard from './FeatureCard.js'

function FeaturesSection() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'md:px-8 mb-32')}>
      <div className={cm.cn(cm.textCenter, cm.sp('mb', 16), cm.maxW('2xl'), cm.mxAuto)}>
        <h2
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'font-headline text-on-surface',
          )}
        >
          {t('featuresSection.heading', {}, { defaultValue: 'Crafted for precision' })}
        </h2>
        <p className="text-on-surface-variant font-body">
          {t(
            'featuresSection.subheading',
            {},
            {
              defaultValue:
                'Everything you need to review, present, and collaborate on 3D assets in a single, elegant environment.',
            },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-4')}>
        {/* Feature 1 */}
        <FeatureCard />
        <FeatureCard
          icon="push_pin"
          title={t('featuresSection.annotationsTitle', {}, { defaultValue: 'Annotations' })}
          description={t(
            'featuresSection.annotationsDescription',
            {},
            {
              defaultValue:
                'Drop precise 3D spatial pins directly onto surfaces to leave context-aware feedback for your team.',
            },
          )}
        />
        <FeatureCard
          icon="code"
          title={t('featuresSection.embedTitle', {}, { defaultValue: 'Embed anywhere' })}
          description={t(
            'featuresSection.embedDescription',
            {},
            {
              defaultValue:
                'Generate iframe snippets instantly to integrate your interactive 3D scenes into any website or application.',
            },
          )}
        />
        {/* Feature 4 */}
        <FeatureCard
          icon="history"
          title={t('featuresSection.versionHistoryTitle', {}, { defaultValue: 'Version history' })}
          description={t(
            'featuresSection.versionHistoryDescription',
            {},
            {
              defaultValue:
                'Never lose a change. Scrub through infinite iterations with our visual timeline and side-by-side comparison.',
            },
          )}
        />
      </div>
    </section>
  )
}

export default FeaturesSection
export { FeaturesSection }
