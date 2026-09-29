import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Link } from 'react-router'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const PILLARS = [
  {
    key: 'cuts',
    num: '1',
    icon: 'percent',
    defaultTitle: 'Zero Cuts on Generosity',
    defaultBody:
      'Every cent donated reaches your cause. No manipulative percentage fees, no forced donor tipping, and no hidden transactional surcharges — simple, predictable subscriptions only.',
  },
  {
    key: 'audit',
    num: '2',
    icon: 'fingerprint',
    defaultTitle: 'Cryptographic Tax Audit Trail',
    defaultBody:
      'Automated IRS § 170(f)(8) contemporaneous substantiation. Each issued receipt is numbered, itemized, and logged so every external audit starts from a clean ledger.',
  },
  {
    key: 'usability',
    num: '3',
    icon: 'sentiment_very_satisfied',
    defaultTitle: 'Steward-First Usability',
    defaultBody:
      'Engineered specifically for advancement coordinators, executive directors, and donor liaisons: high-speed filters, zero-latency search, and one-click batch receipt dispatches.',
  },
] as const

const PRINCIPLES = [
  {
    key: 'fiduciary',
    title: '1. Fiduciary Reverence',
    body: 'Every dollar processed represents moral trust bestowed by a donor upon a shared cause. We treat every micro-transaction and endowment bequest with identical banking-grade reverence and audit safeguards.',
  },
  {
    key: 'predictability',
    title: '2. Radical Predictability',
    body: 'Nonprofit annual budgets cannot tolerate ambiguous variable fees. Flat, fixed billing with zero volume penalties — when your gala exceeds its goal, we celebrate with you.',
  },
  {
    key: 'delight',
    title: '3. Delight in Administration',
    body: 'Administrative burden is the #1 driver of nonprofit staff burnout. We replace chaotic email attachments and archaic legacy databases with refined typography, instantaneous CSV exports, and 2-minute tax packet dispatches.',
  },
  {
    key: 'autonomy',
    title: '4. Data Autonomy & Security',
    body: 'Your donors belong exclusively to your mission. We never aggregate donor behavioral data for third-party brokers, never cross-sell unrelated campaigns, and keep every record exportable.',
  },
] as const

const TEAM = [
  {
    key: 'elena',
    initials: 'ER',
    icon: 'person',
    defaultName: 'Elena Rostova',
    defaultRole: 'Co-Founder & CEO',
    defaultBio:
      'Former advancement director and 12-year foundation trustee. Led $65M capital campaigns prior to establishing Givingly.',
  },
  {
    key: 'marcus',
    initials: 'MV',
    icon: 'code',
    defaultName: 'Marcus Vance',
    defaultRole: 'Co-Founder & CTO',
    defaultBio:
      'Former lead infrastructure architect for compliant financial systems and IRS e-file specification tooling.',
  },
  {
    key: 'sarah',
    initials: 'SJ',
    icon: 'fact_check',
    defaultName: 'Sarah Jenkins, CPA',
    defaultRole: 'Head of Regulatory Compliance',
    defaultBio:
      '15 years specializing exclusively in IRS § 170(f)(8) substantiation, quid-pro-quo benefit valuation, and nonprofit financial statement audits.',
  },
  {
    key: 'david',
    initials: 'DK',
    icon: 'volunteer_activism',
    defaultName: 'David L. Kester',
    defaultRole: 'Head of Donor Stewardship',
    defaultBio:
      'Pioneered donor-retention workflows across 200+ municipal charities. Advocate for high-touch human communication paired with automated ledger accuracy.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(10))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a donor management system built for the small fundraising teams who know every supporter by name. It carries a relationship from the first gift to the year-end receipt — donors, gifts, campaigns, and tax receipts in one place instead of five.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
            )}
          >
            {t(
              'about.missionTitle',
              {},
              {
                defaultValue: 'Restoring joy to stewardship, precision to nonprofit compliance.',
              },
            )}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Nonprofits were sold “software” that turned gratitude into data entry and year-end into a spreadsheet marathon. We believe a two-person development team deserves the same calm tooling as a national charity — every donor, gift, and receipt in one place, so January starts with thank-yous instead of panic.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-origin" className={cm.cn(cm.stack(3))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
            )}
          >
            {t(
              'about.originTitle',
              {},
              {
                defaultValue:
                  'Charities were trapped between predatory platforms and relic software.',
              },
            )}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.originBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'In 2021 our founders watched a 40-year-old conservation trust lose three weeks of mission time every January to manual mail-merges, while contemporary donor tools hid 3–5% platform cuts behind “tip jars.” {{appName}} is the ethical antidote: a transparent stewardship workspace designed with the rigor of a bank vault and the warmth of a handwritten thank-you letter.',
              },
            )}
          </p>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
            {PILLARS.map((p) => (
              <div
                key={p.key}
                className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface-container-low', cm.stack(2))}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-10 h-10 rounded-lg bg-primary-container text-on-primary-container shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-xl">{p.icon}</span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'text-on-surface-variant uppercase tracking-widest',
                    )}
                  >
                    {p.num}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`about.pillar.${p.key}.title`, {}, { defaultValue: p.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(`about.pillar.${p.key}.body`, {}, { defaultValue: p.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-principles" className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
            )}
          >
            {t(
              'about.principlesTitle',
              {},
              { defaultValue: 'The principles governing our code and our stewardship.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.principlesSubtitle',
              {},
              {
                defaultValue:
                  'Because a nonprofit’s reputation takes decades to build and seconds to compromise.',
              },
            )}
          </p>
          <ol className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
            {PRINCIPLES.map((p) => (
              <li
                key={p.key}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/60',
                  cm.stack(2),
                )}
              >
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`about.principle.${p.key}.title`, {}, { defaultValue: p.title })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(`about.principle.${p.key}.body`, {}, { defaultValue: p.body })}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section data-mol-id="about-team" className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-display tracking-tight',
            )}
          >
            {t(
              'about.teamTitle',
              {},
              {
                defaultValue: 'Built by nonprofit advancement directors and compliance veterans.',
              },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.teamSubtitle',
              {},
              {
                defaultValue:
                  'Decades of experience across philanthropic foundations, IRS regulatory compliance, and distributed software engineering.',
              },
            )}
          </p>
          <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            {TEAM.map((m) => (
              <li
                key={m.key}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/60',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'w-12 h-12 rounded-full bg-surface-container text-primary shrink-0',
                  )}
                  aria-hidden="true"
                >
                  {m.initials}
                </span>
                <div className={cm.stack(1)}>
                  <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {t(`about.team.${m.key}.name`, {}, { defaultValue: m.defaultName })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wider text-primary',
                    )}
                  >
                    {t(`about.team.${m.key}.role`, {}, { defaultValue: m.defaultRole })}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(`about.team.${m.key}.bio`, {}, { defaultValue: m.defaultBio })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          data-mol-id="about-cta"
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 8),
            'rounded-xl bg-primary-container text-on-primary-container text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'about.ctaTitle',
              {},
              {
                defaultValue: 'Join over 1,800+ nonprofits modernizing their donor relationships.',
              },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))}>
            {t(
              'about.ctaBody',
              {},
              {
                defaultValue:
                  'Set up in under 15 minutes. Import historical spreadsheets, sync giving in one click, and deliver pristine tax receipts your donors will actually cherish.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', gap: 'md', wrap: 'wrap' }),
              cm.sp('mt', 5),
            )}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg bg-primary text-on-primary',
              )}
            >
              {t('about.ctaPrimary', {}, { defaultValue: 'Start Free Trial (No credit card)' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg border border-outline-variant',
              )}
            >
              {t('about.ctaSecondary', {}, { defaultValue: 'See pricing' })}
            </Link>
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have a question, found a bug, or want to run {{appName}} for your own organization? Reach the team from the Settings page once you are signed in — every message reaches a real person who works on the product.',
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
