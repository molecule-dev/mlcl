import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'realtime',
    defaultValue:
      'Real-time co-writing with live cursors and selections — no saving, no collisions, no lost paragraphs.',
  },
  {
    key: 'comments',
    defaultValue:
      'Threaded comments in the margin: resolve, reopen, and @mention right where the prose lives.',
  },
  {
    key: 'history',
    defaultValue:
      'A version history you can trust — every revision saved, named, and diffable, with one-click restore.',
  },
  {
    key: 'sharing',
    defaultValue:
      'Fine-grained sharing and roles for editors, commenters, and viewers, from public to fully private.',
  },
  {
    key: 'templates',
    defaultValue:
      'Reusable document templates so every brief, draft, or article starts from a consistent foundation.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.subtitle',
        { tagline: APP_TAGLINE },
        { defaultValue: 'Think together, write forever.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.textSize('lg'), 'leading-relaxed text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a collaborative writing studio where editors, writers, and teams draft together in real time. Open a document and the page becomes shared — cursors move, comments thread in the margin, and every revision is kept safe in history.',
            },
          )}
        </p>

        <section className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p
            data-mol-id="about-mission"
            className={cm.cn('leading-relaxed text-on-surface-variant')}
          >
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe long-form writing deserves a calm, focused home — one built around the manuscript, not the meeting or the inbox. Our editor, real-time presence, and version history are all designed so collaborators can move fast together without anyone losing a paragraph or a thought.',
              },
            )}
          </p>
        </section>

        <section className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key} className={cm.cn('leading-relaxed text-on-surface-variant')}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p
            data-mol-id="about-contact"
            className={cm.cn('leading-relaxed text-on-surface-variant')}
          >
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want {{app}} for your studio or team? Reach out from your account settings — every message goes to a real person on the team.',
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
