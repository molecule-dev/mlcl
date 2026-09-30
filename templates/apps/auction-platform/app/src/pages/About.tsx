import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <BrandWordmark as="span" size="md" />
          </Link>
          <Link
            to="/auctions"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('about.browseLink', {}, { defaultValue: 'Browse auctions →' })}
          </Link>
        </div>
      </nav>

      <main
        data-mol-id="page-about"
        className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), cm.stack(8))}
      >
        <header className={cm.stack(3)}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
            {t('about.eyebrow', {}, { defaultValue: 'About us' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t(
              'about.title',
              { app: APP_NAME },
              { defaultValue: `Where collectors meet conviction.` },
            )}
          </h1>
          <p className={cm.cn('text-lg text-on-surface-variant')}>
            {t(
              'about.lede',
              { app: APP_NAME },
              {
                defaultValue: `${APP_NAME} is a live, expert-curated auction marketplace for art, watches, and rare collectibles. Bid in real time, win with confidence, and ship insured anywhere in the world.`,
              },
            )}
          </p>
        </header>

        <section className={cm.stack(4)}>
          <h2 className={cm.cn('text-2xl font-bold tracking-tight')}>
            {t('about.whyHeading', {}, { defaultValue: 'Why we built this' })}
          </h2>
          <p className={cm.cn('text-base text-on-surface-variant leading-relaxed')}>
            {t(
              'common.howItWorks',
              { app: APP_NAME },
              {
                defaultValue: `Auction houses used to mean closed rooms, raised paddles, and a buyer’s premium that ate half your win. We built ${APP_NAME} so any collector — anywhere — can bid against verified peers on lots vetted by working appraisers, with a flat seller-side fee and no buyer’s premium.`,
              },
            )}
          </p>
        </section>

        <section className={cm.stack(4)}>
          <h2 className={cm.cn('text-2xl font-bold tracking-tight')}>
            {t('about.howHeading', {}, { defaultValue: 'How it works' })}
          </h2>
          <ol
            className={cm.cn(
              'list-decimal list-inside space-y-3 text-on-surface-variant leading-relaxed',
            )}
          >
            <li>
              {t(
                'about.howStep1',
                {},
                {
                  defaultValue:
                    'Browse the live floor. Every listing has provenance notes, condition photos, and an appraised reserve.',
                },
              )}
            </li>
            <li>
              {t(
                'about.howStep2',
                {},
                {
                  defaultValue:
                    'Place a bid in seconds. Outbids notify you in-app, by email, and via push so you never lose a lot you wanted.',
                },
              )}
            </li>
            <li>
              {t(
                'about.howStep3',
                {},
                {
                  defaultValue:
                    'When the gavel falls, your card is charged escrow-side. Funds release to the seller only after delivery is confirmed.',
                },
              )}
            </li>
          </ol>
        </section>

        <section className={cm.stack(3)}>
          <h2 className={cm.cn('text-2xl font-bold tracking-tight')}>
            {t('about.contactHeading', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn('text-base text-on-surface-variant leading-relaxed')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions about a lot, a bid, or selling? Our concierge team replies within four business hours.',
              },
            )}
          </p>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/help"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-full text-sm font-semibold border border-outline-variant hover:bg-surface-container-low',
              )}
            >
              {t('about.helpLink', {}, { defaultValue: 'Help centre' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-full text-sm font-semibold text-white',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
              }}
            >
              {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default About
export { About as AboutPage }
