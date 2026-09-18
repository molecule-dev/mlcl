import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn(cm.prose, cm.stack(4))}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a multi-asset portfolio dashboard for individual investors and independent advisors. Equities, ETFs, mutual funds, bonds, real estate and cash — every holding across every account, in one place, with the discipline of a professional desk.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Good investing is mostly discipline: a clear target allocation, honest performance attribution, and tidy tax records. {{app}} brings those institutional habits to anyone, so you can rebalance on purpose instead of on impulse — and never lose sight of what your portfolio is actually doing.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'about.featureUnified',
                {},
                {
                  defaultValue:
                    'One unified portfolio — equities, ETFs, mutual funds, bonds and more, pulled together across every brokerage account.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureRebalance',
                {},
                {
                  defaultValue:
                    'Disciplined rebalancing — set target allocations and tolerance bands, see drift flagged early, and get the trades that bring you back.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAttribution',
                {},
                {
                  defaultValue:
                    'Performance attribution — decompose returns by sector, region and asset class, and benchmark across any window.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureTax',
                {},
                {
                  defaultValue:
                    'Tax-document hygiene — realized and unrealized gains, dividends and 1099 docs in one place, with wash-sale flags included.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureWatchlist',
                {},
                {
                  defaultValue:
                    'Watchlists, news and price alerts so you can act on what matters without the noise.',
                },
              )}
            </li>
          </ul>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want a feature? Reach out from your account settings — every message goes to a real person on the team. Note: nothing here is investment advice; you stay in control of every trade.',
              },
            )}
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
