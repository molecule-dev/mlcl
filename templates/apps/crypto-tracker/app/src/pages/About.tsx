import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Public "About" page — describes what {@link APP_NAME} is, its mission, and
 * the key features traders get. Wrapped in the same {@link ContentPageShell}
 * chrome the public Pricing page uses so the brand stays consistent.
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
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
              defaultValue: `${APP_NAME} is a real-time cryptocurrency terminal that pulls live market data, your portfolio, price alerts, and the news that moves coins into one calm, fast desk. Track every position's profit and loss, watch the assets you care about, and decode the signals that matter — without the noise of a dozen browser tabs.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `Crypto markets never sleep, and the data is scattered across exchanges, explorers, and feeds. ${APP_NAME} exists to give every investor — from the curious to the professional — a single, trustworthy view of the entire ledger, with realtime prices, honest portfolio math, and standing alerts on the conditions you choose. No dark patterns, no buried fees, just signal.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            <li>
              {t(
                'about.featureMarkets',
                {},
                {
                  defaultValue:
                    'Live market data and price charts across thousands of coins, ranked by market cap, volume, and momentum.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featurePortfolio',
                {},
                {
                  defaultValue:
                    'Portfolio tracking with real profit-and-loss, cost basis, and allocation — connected to your transaction history.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAlerts',
                {},
                {
                  defaultValue:
                    'Price alerts on the conditions that matter, delivered by email and push so you never miss a move.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureWatchlist',
                {},
                {
                  defaultValue:
                    'A personal watchlist and curated crypto news with signals on the assets you follow.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue: `Have feedback, found a bug, or want to suggest a feature? Reach out from your account settings — every message goes to a real person on the ${APP_NAME} team.`,
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
