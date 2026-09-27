/**
 * Public "About" page. App-specific content grounded in the product —
 * an AI travel agent (speech-to-text, a tool-calling agent, text-to-speech,
 * flights, texts and bill splitting). Wrapped in the same
 * public chrome (Header + Footer) used by Pricing / Privacy / Terms.
 * Every string flows through `t()`.
 *
 * @returns The rendered about page.
 */
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'voice',
    titleKey: 'about.feature.voice.title',
    titleDefault: 'Book by voice',
    bodyKey: 'about.feature.voice.body',
    bodyDefault:
      'Say where and when. The agent searches real flights, reads the options back and books the one you confirm.',
  },
  {
    id: 'rebook',
    titleKey: 'about.feature.rebook.title',
    titleDefault: 'Rebooked when delayed',
    bodyKey: 'about.feature.rebook.body',
    bodyDefault:
      'A delay of an hour or more moves you to the next flight on the route. You get a text with the new confirmation.',
  },
  {
    id: 'split',
    titleKey: 'about.feature.split.title',
    titleDefault: 'Split the bill',
    bodyKey: 'about.feature.split.body',
    bodyDefault:
      'Name who is flying and everyone gets an even share and a pay link by text. Trips show who has paid.',
  },
  {
    id: 'trips',
    titleKey: 'about.feature.trips.title',
    titleDefault: 'Every trip in one place',
    bodyKey: 'about.feature.trips.body',
    bodyDefault:
      'Bookings, moves, delays and payments are recorded on the trip, so you always know what the agent did.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is an AI travel agent. Say where you are going and it books the flight, moves you when the flight is delayed, and splits the bill with whoever is coming.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Booking a trip should take one sentence, not twenty taps. {{app}} does the searching, the booking and the follow-up, and tells you what it did before and after it does it.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            {FEATURES.map((f) => (
              <article
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface border border-border',
                )}
              >
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </article>
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, a feature request, or found a bug? Reach the {{app}} team through the support link in your account menu — every message goes to a real human.',
              },
            )}
          </p>
        </section>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/signup"
            data-mol-id="about-cta-signup"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary')}
          >
            {t('common.getStarted', {}, { defaultValue: 'Get started' })}
          </Link>
          <Link
            to="/"
            data-mol-id="about-back-home"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary')}
          >
            {t('nav.backToHome', {}, { defaultValue: '← Back to home' })}
          </Link>
        </div>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
