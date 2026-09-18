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
    id: 'campaigns',
    titleKey: 'about.featureCampaignsTitle',
    titleDefault: 'Campaign pages that convert',
    bodyKey: 'about.featureCampaignsBody',
    bodyDefault:
      'Tell your story with a rich campaign page — cover imagery, a funding goal, and reward tiers — then watch a live progress bar update as backers pledge.',
  },
  {
    id: 'rewards',
    titleKey: 'about.featureRewardsTitle',
    titleDefault: 'Flexible reward tiers',
    bodyKey: 'about.featureRewardsBody',
    bodyDefault:
      'Offer backers something in return at every price point, cap availability with limited tiers, and set estimated delivery dates they can trust.',
  },
  {
    id: 'payments',
    titleKey: 'about.featurePaymentsTitle',
    titleDefault: 'Secure payments',
    bodyKey: 'about.featurePaymentsBody',
    bodyDefault:
      'Pledges are processed securely through Stripe, so funds reach creators safely and backers can pledge with confidence.',
  },
  {
    id: 'updates',
    titleKey: 'about.featureUpdatesTitle',
    titleDefault: 'Backer updates',
    bodyKey: 'about.featureUpdatesBody',
    bodyDefault:
      'Keep your community in the loop with project updates — including backers-only posts — and email notifications that bring people back.',
  },
  {
    id: 'discover',
    titleKey: 'about.featureDiscoverTitle',
    titleDefault: 'Discovery and search',
    bodyKey: 'about.featureDiscoverBody',
    bodyDefault:
      'Browse trending and featured campaigns by category, and let the right backers find your project through fast, full-text search.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        { defaultValue: 'Crowdfunding for ambitious creators and the people who back them.' },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.textSize('lg'), cm.prose, 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a crowdfunding platform where ambitious creators launch campaigns and the people who believe in them help bring those ideas to life. Set a funding goal, offer reward tiers, share your progress, and rally a community behind what matters.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `We believe great ideas deserve a fair shot, no matter who they come from. ${APP_NAME} gives creators the tools to fund their work transparently and gives backers a direct, trustworthy way to support the projects they want to see exist.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(6))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
            {FEATURES.map((f) => (
              <article
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(2),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant',
                )}
              >
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have a question, found a bug, or want to launch your first campaign? We would love to hear from you — every message reaches a real person on the team.',
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
