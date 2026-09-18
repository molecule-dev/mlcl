import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES: {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}[] = [
  {
    id: 'capture',
    titleKey: 'about.feature.capture.title',
    titleDefault: 'One-tap capture',
    bodyKey: 'about.feature.capture.body',
    bodyDefault:
      'Record your screen, mic, and camera straight from the browser. Trim, add a title, and your clip is ready to share in seconds — no editing suite required.',
  },
  {
    id: 'sharing',
    titleKey: 'about.feature.sharing.title',
    titleDefault: 'Sharing links you control',
    bodyKey: 'about.feature.sharing.body',
    bodyDefault:
      'Send a single link instead of scheduling another meeting. Add a password, an expiry date, or a view cap, and decide whether viewers can download the original.',
  },
  {
    id: 'analytics',
    titleKey: 'about.feature.analytics.title',
    titleDefault: 'Viewer analytics',
    bodyKey: 'about.feature.analytics.body',
    bodyDefault:
      'See who watched, how far they got, and where they re-watched. Engagement data turns a one-way recording into a real feedback loop.',
  },
  {
    id: 'comments',
    titleKey: 'about.feature.comments.title',
    titleDefault: 'Time-coded comments',
    bodyKey: 'about.feature.comments.body',
    bodyDefault:
      'Reviewers leave threaded comments pinned to the exact frame they are talking about, so design reviews and bug reports stay precise.',
  },
  {
    id: 'workspaces',
    titleKey: 'about.feature.workspaces.title',
    titleDefault: 'Team workspaces',
    bodyKey: 'about.feature.workspaces.body',
    bodyDefault:
      'Organize recordings into shared folders, invite teammates with roles, and keep your library searchable as it grows.',
  },
]

/**
 * Public "About" page.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
      subtitle={t(
        'about.tagline',
        { appName: APP_NAME },
        { defaultValue: 'Async screen recordings for remote teams.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a screen recording platform built for teams who would rather send a clip than sit through another meeting. Capture your screen with audio, comments, and camera, share a link, and watch exactly how people engage — so design reviews, bug reports, and walkthroughs travel further than any live call could.',
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
              { appName: APP_NAME },
              {
                defaultValue:
                  'Remote work runs on shared context, and most of it gets lost in calendars and call notes. {{appName}} exists to make that context easy to capture and easy to revisit — an async-first way to show your work, gather feedback, and keep everyone aligned without forcing them into the same time zone.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have feedback, hit a bug, or want to roll {{appName}} out to your whole team? Reach us from your account settings — every message reaches a real person on the team.',
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
