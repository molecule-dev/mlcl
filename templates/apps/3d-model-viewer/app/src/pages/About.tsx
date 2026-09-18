import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import TopNavBar from '../components/TopNavBar.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<TopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue:
            'The premium 3D visualization platform for technical artisans and creative studios.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.prose, cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a 3D model viewer for the web. Upload your models, explore them in real time with hardware-accelerated WebGL, pin annotations to any point on the surface, and embed an interactive viewer anywhere — no plugins, no downloads, just a link.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Great 3D work deserves a great way to be seen. We build the fastest, cleanest way to share interactive models with clients, collaborators, and communities — so the craft, not the toolchain, is what people remember.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            <li>
              {t(
                'about.featureViewer',
                {},
                {
                  defaultValue:
                    'A real-time WebGL viewer with smooth orbit, pan, and zoom, configurable lighting and environments, and crisp rendering on desktop and mobile.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAnnotations',
                {},
                {
                  defaultValue:
                    'Spatial annotations — pin titled, described notes to exact points on a model so viewers see context exactly where it matters.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureEmbed',
                {},
                {
                  defaultValue:
                    'One-click embeds — drop an interactive viewer into any site or doc with custom dimensions, auto-rotate, and theme.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureLibrary',
                {},
                {
                  defaultValue:
                    'A searchable, taggable model library with comments, so feedback and discovery live alongside your work.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featurePlans',
                {},
                {
                  defaultValue:
                    'Plans that scale with you — Free to get started, Pro and Team for higher model, annotation, and embed limits, exports, and longer retention.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have feedback, a feature request, or a partnership idea? We read every message — reach the {{appName}} team from your account and a real human will reply.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
