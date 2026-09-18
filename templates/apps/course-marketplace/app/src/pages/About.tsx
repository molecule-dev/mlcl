import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'Our story' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue:
            'A curated course marketplace where instructors publish video lessons and learners earn certificates that signal genuine expertise.',
        },
      )}
    >
      <div data-mol-id="about-body" className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is an editorial archive of mastery. We bring together expert instructors and ambitious learners around high-quality, hand-curated courses — listings you can browse, lessons you can stream, and certificates you can be proud to share.`,
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
                  'We believe learning online should feel like reading a great editorial archive — curated, calm, and built to last. We give instructors the tools to teach millions and give learners a clear path from their first lesson to a verifiable certificate.',
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
                'about.featureCatalog',
                {},
                {
                  defaultValue:
                    'A searchable catalog of courses across development, business, design, and more — filtered by category, level, and rating.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureVideo',
                {},
                {
                  defaultValue:
                    'Streaming video lessons with progress tracking, so you always pick up exactly where you left off.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureCertificates',
                {},
                {
                  defaultValue:
                    'Verifiable certificates issued the moment you complete a course — ready to share with employers and peers.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureInstructors',
                {},
                {
                  defaultValue:
                    'A path to teach: publish your own courses, manage lessons, and reach learners worldwide as an instructor.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want to teach on the platform? Reach out from the Help page — every message goes to a real human on the team.',
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
