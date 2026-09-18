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
    id: 'accounts',
    titleKey: 'about.featureAccounts.title',
    titleDefault: 'Every account in one place',
    bodyKey: 'about.featureAccounts.body',
    bodyDefault:
      'Track checking, savings, credit cards, and brokerage accounts side by side, with running balances and a live net-worth view that updates as you record activity.',
  },
  {
    id: 'transactions',
    titleKey: 'about.featureTransactions.title',
    titleDefault: 'Transactions that organize themselves',
    bodyKey: 'about.featureTransactions.body',
    bodyDefault:
      'Log income and spending, split by category, and let built-in AI categorization sort new transactions for you so your books stay tidy without the busywork.',
  },
  {
    id: 'budgets',
    titleKey: 'about.featureBudgets.title',
    titleDefault: 'Budgets and savings goals',
    bodyKey: 'about.featureBudgets.body',
    bodyDefault:
      'Set monthly budgets per category and savings goals with target amounts and deadlines, then watch progress bars fill as you move money toward what matters.',
  },
  {
    id: 'reports',
    titleKey: 'about.featureReports.title',
    titleDefault: 'Reports, insights, and clean exports',
    bodyKey: 'about.featureReports.body',
    bodyDefault:
      'See income vs. expenses, spending by category, and cash-flow trends over time — then import or export your data as CSV whenever you need it elsewhere.',
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
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <p
        data-mol-id="about-intro"
        className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t(
          'about.intro',
          { app: APP_NAME },
          {
            defaultValue: `${APP_NAME} is a personal finance tracker that brings your accounts, transactions, budgets, and savings goals into one calm, private dashboard. It is built for people who want a clear picture of where their money goes — without spreadsheets, ads, or selling your financial data.`,
          },
        )}
      </p>

      <div data-mol-id="about-sections" className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `We believe understanding your money should be simple and stress-free. ${APP_NAME} turns raw transactions into net worth, budgets, and goals you can act on — so you spend less time reconciling and more time making confident decisions.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(6))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
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
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue: `Questions, feedback, or a bug to report? Email us at hello@emeraldledger.example — every message reaches a real person on the ${APP_NAME} team.`,
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
