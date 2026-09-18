import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'discover',
    defaultTitle: 'Discovery worth your time',
    defaultBody:
      'Trending feeds, full-text search, and channel recommendations help you find the videos and creators you actually want to watch.',
  },
  {
    key: 'create',
    defaultTitle: 'A complete creator studio',
    defaultBody:
      'Upload once and {{appName}} handles HLS streaming, auto-generated subtitles, chapter markers, and analytics — everything a channel needs to publish.',
  },
  {
    key: 'social',
    defaultTitle: 'Built to be social',
    defaultBody:
      'Comments, likes, subscriptions, and shared playlists keep the conversation going long after the video ends.',
  },
  {
    key: 'plans',
    defaultTitle: 'Plans that scale with you',
    defaultBody:
      'Start free, then move to Pro or Team for more channels, more videos, longer retention, data export, and advanced features.',
  },
] as const

/**
 * Public About page for {@link APP_NAME}.
 *
 * @returns The rendered About page wrapped in the app's public chrome.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a streaming-first video platform where you can discover, watch, and follow the channels you love — and publish your own. No bot-fueled feeds and no autoplay traps, just videos worth your time.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `We believe video should reward the creators who make it and respect the people who watch it. ${APP_NAME} puts uploading, streaming, captions, chapters, and community in one place so anyone can build an audience without fighting the platform.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                data-mol-id={`about-feature-${f.key}`}
                className={cm.cn(
                  cm.stack(1),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
                )}
              >
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    `about.feature.${f.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want to feature your channel? Reach out from your account settings — every message goes to a real person on the team.',
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
