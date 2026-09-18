import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
    id: 'records',
    titleKey: 'about.feature.records.title',
    titleDefault: 'Employee records',
    bodyKey: 'about.feature.records.body',
    bodyDefault:
      'One canonical profile per person — contact details, role, manager, employment type, tenure, and status. No more scattered spreadsheets or stale org data.',
  },
  {
    id: 'pto',
    titleKey: 'about.feature.pto.title',
    titleDefault: 'PTO & approvals',
    bodyKey: 'about.feature.pto.body',
    bodyDefault:
      'Vacation, sick, and personal time on a single calendar with one-click approvals and accrual policies, so teams always know who is out and balances stay accurate.',
  },
  {
    id: 'org',
    titleKey: 'about.feature.org.title',
    titleDefault: 'Living org chart',
    bodyKey: 'about.feature.org.body',
    bodyDefault:
      'Reporting lines that match reality, with departments, headcount roll-ups, and reassignments that keep the structure current as the team grows.',
  },
  {
    id: 'documents',
    titleKey: 'about.feature.documents.title',
    titleDefault: 'Secure documents',
    bodyKey: 'about.feature.documents.body',
    bodyDefault:
      'Contracts, handbooks, and comp letters stored per employee with scoped access and a full audit trail — every view and change is logged.',
  },
  {
    id: 'performance',
    titleKey: 'about.feature.performance.title',
    titleDefault: 'Performance & onboarding',
    bodyKey: 'about.feature.performance.body',
    bodyDefault:
      'Review cycles, ratings, and onboarding checklists keep growth conversations and new-hire ramp-up on track from day one.',
  },
  {
    id: 'reports',
    titleKey: 'about.feature.reports.title',
    titleDefault: 'Reports & exports',
    bodyKey: 'about.feature.reports.body',
    bodyDefault:
      'Headcount, turnover, and PTO reports with CSV export and audit logging, so people leaders can answer questions without a data team.',
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
      eyebrow={t('about.eyebrow', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a calm, considerate HR system for growing teams of 50 to 500. Employees, PTO, org structure, and documents live in one source of truth — no enterprise gloss, just clarity for the people who care for people.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'People teams spend too much time wrangling spreadsheets and chasing approvals in Slack. We build the boring-but-essential HR foundation — records, time off, structure, and documents — so HR can spend its energy on people, not paperwork.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.grid({ cols: 2, gap: 'md' })}>
            {FEATURES.map((f) => (
              <div
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 1),
                    'text-on-surface',
                  )}
                >
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or want to see {{app}} with your own team? Reach out from your workspace settings — every message goes to a real person on our team.',
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
