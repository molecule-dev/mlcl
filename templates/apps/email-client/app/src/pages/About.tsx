import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()

  return (
    <div
      data-mol-id="page-about"
      className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface')}
    >
      <Header />
      <main className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 12))}>
        <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 8))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('about.eyebrow', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('about.title', { app: APP_NAME }, { defaultValue: 'Email for focused work' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}>
            {t(
              'about.subtitle',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a calm, three-pane inbox built by a small team that wanted to process information instead of reacting to it.',
              },
            )}
          </p>
        </header>

        <section className={cm.cn(cm.prose, cm.flex({ direction: 'col', gap: 'md' }))}>
          <h2>
            {t('about.story', { appName: APP_NAME }, { defaultValue: 'Why we built {{appName}}' })}
          </h2>
          <p>
            {t(
              'about.story.p1',
              { app: APP_NAME },
              {
                defaultValue:
                  'Most email clients optimise for engagement — pulling you back, fragmenting your attention, suggesting one more tap. {{app}} does the opposite. We measure success by the time you spend NOT in your inbox: triage fast, defer with confidence, and get on with the work that matters.',
              },
            )}
          </p>
          <p>
            {t(
              'about.story.p2',
              {},
              {
                defaultValue:
                  'The product is keyboard-first, opinionated about the small set of features knowledge workers actually use, and refuses to sell anyone\u2019s attention to anyone else. There is no advertising, no data resale, and no dark pattern that nudges you back into the app.',
              },
            )}
          </p>

          <h2>{t('about.principles', {}, { defaultValue: 'The principles we ship by' })}</h2>
          <ul>
            <li>
              <strong>{t('about.principle.calm', {}, { defaultValue: 'Calm by default.' })}</strong>{' '}
              {t(
                'about.principle.calm.desc',
                {},
                {
                  defaultValue:
                    'No badges that scream, no notifications you didn\u2019t ask for, no animations that demand a glance.',
                },
              )}
            </li>
            <li>
              <strong>
                {t('about.principle.fast', {}, { defaultValue: 'Fast as a thought.' })}
              </strong>{' '}
              {t(
                'about.principle.fast.desc',
                {},
                {
                  defaultValue:
                    'Every action is one keystroke away. The inbox loads in under 200ms on a fresh sign-in.',
                },
              )}
            </li>
            <li>
              <strong>
                {t('about.principle.honest', {}, { defaultValue: 'Honest about your data.' })}
              </strong>{' '}
              {t(
                'about.principle.honest.desc',
                {},
                {
                  defaultValue:
                    'Encryption in transit and at rest, transparent retention, and a one-click data export.',
                },
              )}
            </li>
          </ul>

          <h2>{t('about.team', {}, { defaultValue: 'The team' })}</h2>
          <p>
            {t(
              'about.team.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'We are a distributed team of designers and engineers who once spent too many hours of every day in a noisy mailbox. {{appName}} is the inbox we wanted to use ourselves.',
              },
            )}
          </p>
        </section>

        <footer className={cm.cn(cm.sp('mt', 10), cm.flex({ gap: 'md' }))}>
          <Link
            to="/signup"
            data-mol-id="about-signup"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-shadow',
            )}
          >
            {t('about.cta.signup', { appName: APP_NAME }, { defaultValue: 'Try {{appName}} free' })}
          </Link>
          <Link
            to="/help"
            data-mol-id="about-help"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('about.cta.help', {}, { defaultValue: 'Browse help articles' })}
          </Link>
        </footer>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
