import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicHeader } from '../components/PublicHeader.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'accounts',
    titleKey: 'about.feature.accounts.title',
    titleDefault: 'Every account in one view',
    bodyKey: 'about.feature.accounts.body',
    bodyDefault:
      'See checking, savings, and brokerage balances side by side, with available funds and recent activity on a single calm dashboard.',
  },
  {
    id: 'transfers',
    titleKey: 'about.feature.transfers.title',
    titleDefault: 'Transparent transfers',
    bodyKey: 'about.feature.transfers.body',
    bodyDefault:
      'Move money between linked accounts and saved recipients with every fee disclosed before you confirm — no surprises after the fact.',
  },
  {
    id: 'statements',
    titleKey: 'about.feature.statements.title',
    titleDefault: 'Clean statements & history',
    bodyKey: 'about.feature.statements.body',
    bodyDefault:
      'Download PDF statements by period, search transactions by category, and export to CSV whenever you need a record.',
  },
  {
    id: 'security',
    titleKey: 'about.feature.security.title',
    titleDefault: 'Audit-grade security',
    bodyKey: 'about.feature.security.body',
    bodyDefault:
      'Card numbers are encrypted at rest with AES-256, every sign-in and transfer is logged, and you can revoke a trusted device with one click.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<PublicHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { appName: APP_NAME },
        {
          defaultValue: `${APP_NAME} is multi-account banking built to keep money in motion and always clear. We bring your checking, savings, and brokerage balances together with transparent transfers and clean, downloadable statements — no surprise fees, no clutter.`,
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
              { appName: APP_NAME },
              {
                defaultValue: `Banking should respect your time and your trust. ${APP_NAME} is designed to show you exactly where your money is, what each move costs, and who can access your accounts — so you can make confident decisions in minutes, not hours.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
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
              {},
              {
                defaultValue:
                  'Have a question about an account, found a bug, or want to tell us what to build next? Reach our team from the support options in your account settings — every message goes to a real person.',
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
