import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'catalog',
    defaultTitle: 'A catalog worth getting lost in',
    defaultBody:
      'Millions of tracks across every genre, with artist and album pages, lossless streaming, and zero ads interrupting the music.',
  },
  {
    key: 'playlists',
    defaultTitle: 'Playlists and a queue that keep up',
    defaultBody:
      'Build playlists, line up a queue, and pick up exactly where you left off across every device with synced playback.',
  },
  {
    key: 'radio',
    defaultTitle: 'Radio tuned to your taste',
    defaultBody:
      'Seed a station from any track and let it run — recommendations that learn what you actually want to hear.',
  },
  {
    key: 'social',
    defaultTitle: 'Listening that is social',
    defaultBody:
      'Follow artists and friends, share what you love, and keep a personal library of liked songs and saved playlists.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a music streaming home for the way you actually listen — millions of tracks, curated playlists, personal radio, and a library that follows you everywhere. No ads, no clutter, just the music.`,
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
                defaultValue: `We believe streaming should put the music first. ${APP_NAME} is built to make discovery effortless, listening seamless across your devices, and your library truly yours — with the artists, playlists, and people you love a tap away.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface-container-low rounded-2xl border border-outline-variant/40',
                )}
              >
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
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
                defaultValue: `Have feedback, a feature request, or found a bug? We would love to hear from you — every message reaches a real person on the ${APP_NAME} team.`,
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
