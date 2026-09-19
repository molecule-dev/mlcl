import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const LANGUAGE_CHIPS = ['English', 'Español', 'Français', 'Deutsch', '中文', '日本語'] as const

const FEATURES = [
  {
    icon: 'translate',
    key: 'languageDetection',
    title: 'Detects the caller\u2019s language',
    body: 'The agent hears the first sentence and answers in the caller\u2019s own language — six languages out of the box, configurable per line.',
  },
  {
    icon: 'event_available',
    key: 'booksRooms',
    title: 'Books rooms on the call',
    body: 'Searches live availability, quotes the computed rate, and confirms the booking with a code — through the same rules as the front desk.',
  },
  {
    icon: 'dashboard',
    key: 'fullPms',
    title: 'A real PMS behind it',
    body: 'Rooms, room types, rate plans with weekend and seasonal pricing, reservations with the full lifecycle, and guest profiles with stay history.',
  },
  {
    icon: 'support_agent',
    key: 'simulator',
    title: 'Try it on the Call Simulator',
    body: 'Type what a caller would say and watch the agent detect the language, call its tools, and book the room — live, action by action.',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex flex-col',
      )}
    >
      <Header />

      {/* Hero — the multilingual voice pitch */}
      <section
        className={cm.cn('relative overflow-hidden bg-primary text-on-primary')}
        data-mol-id="landing-hero"
      >
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(96),
            cm.h(96),
            cm.roundedFull,
            'absolute -right-24 -top-24 bg-accent/20 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.maxW('6xl'),
            cm.sp('px', 6),
            cm.sp('py', 20),
            cm.mxAuto,
            'relative z-10',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.3em] text-tertiary',
            )}
          >
            {t('landing.hero.eyebrow', {}, { defaultValue: 'AI hotel receptionist + PMS' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('5xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 4),
              'leading-[1.05] text-white max-w-3xl',
            )}
            data-mol-id="landing-headline"
          >
            {t(
              'landing.hero.heading',
              {},
              {
                defaultValue:
                  'Every call answered \u2014 in the guest\u2019s own language, at any hour.',
              },
            )}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              cm.sp('mt', 5),
              'max-w-2xl text-white/90 leading-relaxed',
            )}
          >
            {t(
              'landing.hero.subheading',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is the multilingual AI voice receptionist for your front desk: it picks up, detects the caller\u2019s language, answers in it, and books available rooms \u2014 while your staff run rooms, rates, reservations, and guests in the same workspace.',
              },
            )}
          </p>

          <div
            className={cm.cn(cm.sp('mt', 8), cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}
          >
            <Link
              to="/signup"
              data-mol-id="landing-cta-signup"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-accent text-on-tertiary hover:opacity-90 transition-opacity shadow-lg',
              )}
            >
              {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start answering in 6 languages' })}
            </Link>
            <Link
              to="/login"
              data-mol-id="landing-cta-login"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-surface/15 text-white ring-1 ring-white/30 hover:bg-surface/25 transition-colors',
              )}
            >
              {t('landing.hero.ctaSecondary', {}, { defaultValue: 'Sign in to the front desk' })}
            </Link>
          </div>

          {/* Language chips */}
          <ul
            className={cm.cn(
              cm.sp('mt', 10),
              cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            )}
            aria-label={t(
              'landing.hero.languagesLabel',
              {},
              { defaultValue: 'Languages the voice agent speaks' },
            )}
          >
            {LANGUAGE_CHIPS.map((chip) => (
              <li
                key={chip}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-surface/15 ring-1 ring-white/25 text-white',
                )}
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section
        className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, 'w-full')}
      >
        <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('landing.features.heading', {}, { defaultValue: 'The front desk that never sleeps' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'landing.features.subheading',
            {},
            {
              defaultValue:
                'One workspace for the phone line and the property: the voice agent works the same availability and pricing rules your staff do.',
            },
          )}
        </p>
        <div className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 sm:grid-cols-2 gap-6')}>
          {FEATURES.map((f) => (
            <article
              key={f.key}
              data-mol-id={'landing-feature-' + f.key}
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface border border-outline-variant shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(12),
                  cm.h(12),
                  'rounded-xl bg-primary/10 text-primary',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-2xl">{f.icon}</span>
              </span>
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
                {t('landing.features.' + f.key + '.title', {}, { defaultValue: f.title })}
              </h3>
              <p
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t('landing.features.' + f.key + '.body', {}, { defaultValue: f.body })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
