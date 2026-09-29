import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

interface Pledge {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

/** The four architectural privacy pledges the policy opens with. */
const PLEDGES: Pledge[] = [
  {
    id: 'pixels',
    icon: 'visibility_off',
    titleKey: 'privacy.pledge.pixels.title',
    titleDefault: 'Zero Invisible Tracking Pixels',
    bodyKey: 'privacy.pledge.pixels.body',
    bodyDefault:
      'We never embed 1×1 tracking GIFs, device-fingerprinting scripts, or geolocation beacon telemetry in your dispatches. Open-rate telemetry is opt-in only.',
  },
  {
    id: 'graph',
    icon: 'dataset',
    titleKey: 'privacy.pledge.graph.title',
    titleDefault: '100% Sovereign Subscriber Graph',
    bodyKey: 'privacy.pledge.graph.body',
    bodyDefault:
      'Your reader list is exportable in raw CSV, JSON, and mbox at any moment. We never claim co-ownership of your audience.',
  },
  {
    id: 'billing',
    icon: 'account_balance',
    titleKey: 'privacy.pledge.billing.title',
    titleDefault: 'Direct Stripe Connect Billing',
    bodyKey: 'privacy.pledge.billing.body',
    bodyDefault:
      'We never touch raw credit cards or hold reader subscription payouts hostage. Pledges flow directly between reader and creator.',
  },
  {
    id: 'profiling',
    icon: 'no_encryption',
    titleKey: 'privacy.pledge.profiling.title',
    titleDefault: 'Zero Algorithmic Profiling',
    bodyKey: 'privacy.pledge.profiling.body',
    bodyDefault:
      'No cross-publication recommendation engines, no ad-network cookies, and no remarketing behavioral pixels. Ad brokers are strictly forbidden.',
  },
]

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'When you create an account we store the email address and password you provide. When you publish, comment, clap, or bookmark, we store the resulting record so we can show it back to you and your readers. We use industry-standard hashing for passwords and tokens.',
  },
  {
    id: 'use',
    titleKey: 'privacy.use.title',
    titleDefault: 'How we use your data',
    bodyKey: 'privacy.use.body',
    bodyDefault:
      'We use your data only to operate the platform: serve your posts to the readers who visit them, calculate analytics on your dashboard, send transactional emails (password resets, billing receipts), and process payments via our payment provider. We never sell or share personal data for advertising.',
  },
  {
    id: 'cookies',
    titleKey: 'privacy.cookies.title',
    titleDefault: 'Cookies and tracking',
    bodyKey: 'privacy.cookies.body',
    bodyDefault:
      'We use a single first-party cookie to keep you signed in and a separate session cookie if you choose to enable analytics. We do not use third-party advertising cookies, fingerprinting scripts, or social-network pixels.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can export every post, comment, and bookmark from Settings → Privacy. You can delete your account from Settings → Account; deletion removes all personal data within 30 days. You can ask us to amend incorrect data by emailing privacy@writeflow.example.',
  },
  {
    id: 'updates',
    titleKey: 'privacy.updates.title',
    titleDefault: 'Updates',
    bodyKey: 'privacy.updates.body',
    bodyDefault:
      'When this policy changes we will email every active account at least 14 days before the change takes effect.',
  },
  {
    id: 'processors',
    titleKey: 'privacy.processors.title',
    titleDefault: 'Third-Party Processors & Infrastructure',
    bodyKey: 'privacy.processors.body',
    bodyDefault:
      'We deliberately avoid infrastructure vendors that monetize traffic metadata. Our reliance on third parties is limited to essential, high-availability primitives: the payment processor (which holds card data under PCI DSS Level 1 and never shares it with us), the email relay that transports your dispatches, and the bare-metal hosts that store encrypted backups. Each processor is bound by strict Standard Contractual Clauses and listed here — there is no hidden fourth party.',
  },
  {
    id: 'international',
    titleKey: 'privacy.international.title',
    titleDefault: 'GDPR, CCPA & International Sovereignty',
    bodyKey: 'privacy.international.body',
    bodyDefault:
      'Whether you reside in Berlin, California, Seoul, or Melbourne, you get the exact same uncompromising standard of protection. We do not downgrade privacy rights based on geographical jurisdiction: every reader may access, correct, export, or erase their personal data, and every author may take their entire publication and leave at any time.',
  },
  {
    id: 'custodian',
    titleKey: 'privacy.custodian.title',
    titleDefault: 'Contacting Our Data Custodian',
    bodyKey: 'privacy.custodian.body',
    bodyDefault:
      'Our data custodian and security engineering team review every inquiry about data portability, account deletion, or architectural specifications directly — no ticketing black hole. Write to privacy@dispatch.press and a named human answers within two business days.',
  },
]

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
    >
      <p
        data-mol-id="privacy-effective"
        className={cm.cn(cm.textSize('sm'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t('privacy.effective', {}, { defaultValue: 'Last updated: 1 May 2026' })}
      </p>
      {/* Architectural guarantees — the design's four privacy pledges */}
      <section data-mol-id="privacy-pledges" className={cm.cn(cm.sp('mb', 12))}>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            "font-['Newsreader'] text-on-background",
            cm.sp('mb', 2),
          )}
        >
          {t(
            'privacy.pledges.title',
            {},
            { defaultValue: 'Privacy as an Architectural Guarantee, Not a Policy Loophole.' },
          )}
        </h2>
        <p className={cm.cn(cm.prose, cm.sp('mb', 6), 'text-on-surface-variant')}>
          {t(
            'privacy.pledges.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                'True privacy cannot be a set of permissive checkboxes tucked inside a settings sub-panel. {{appName}} enforces it structurally — here is the architecture, in four pledges.',
            },
          )}
        </p>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
          {PLEDGES.map((p) => (
            <div
              key={p.id}
              data-mol-id={`privacy-pledge-${p.id}`}
              className={cm.cn(
                cm.stack(2),
                cm.sp('p', 5),
                'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'w-9 h-9 rounded-sm bg-primary-fixed text-primary justify-center',
                )}
              >
                <span className={cm.fv5b245ffa} aria-hidden>
                  {p.icon}
                </span>
              </div>
              <h3
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t(p.titleKey, {}, { defaultValue: p.titleDefault })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(p.bodyKey, { appName: APP_NAME }, { defaultValue: p.bodyDefault })}
              </p>
            </div>
          ))}
        </div>
      </section>
      <div data-mol-id="privacy-sections" className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
