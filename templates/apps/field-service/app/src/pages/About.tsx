import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES: { key: string; def: string }[] = [
  {
    key: 'about.featureQuotes',
    def: 'Quotes with real line items — parts and labor priced by quantity and rate, sent to the customer in one click and converted to a job the moment they say yes.',
  },
  {
    key: 'about.featureDispatch',
    def: 'A weekly dispatch board with technicians as rows and days as columns, so filling the schedule is a glance instead of a phone chain.',
  },
  {
    key: 'about.featureChecklists',
    def: 'Per-job checklists and a notes timeline that capture what the tech actually did on site — done flags, timestamps, and photos where it matters.',
  },
  {
    key: 'about.featureTechnicians',
    def: 'Technician records with trade tags and certifications, plus a live count of each tech’s open jobs before you book another one on them.',
  },
  {
    key: 'about.featureInvoicing',
    def: 'Invoices generated from completed jobs with the quote’s line items already copied in — send it, mark it paid, done.',
  },
  {
    key: 'about.featureCustomers',
    def: 'A customer book with service history per address, so anyone answering the phone knows the house before they roll a truck.',
  },
]

/** One side of the old-way vs. Toolbelt-standard comparison. */
const OLD_WAY: { key: string; def: string }[] = [
  {
    key: 'about.oldWay.onboarding',
    def: '12-week mandatory onboardings — $5,000 just to teach your dispatchers 40 confusing configuration sub-menus.',
  },
  {
    key: 'about.oldWay.salesmen',
    def: 'Salesmen who never turned a wrench — roadmaps engineered to impress investors, not fix a refrigerant leak in a freezing crawlspace.',
  },
  {
    key: 'about.oldWay.seatTaxes',
    def: 'Per-tech “seat taxes” — every new apprentice costs another license fee, punishing your shop for growing.',
  },
  {
    key: 'about.oldWay.sync',
    def: 'Fragile cloud sync that dies in basements — drop one bar of reception and you lose photos, notes, and signatures.',
  },
]

const STANDARD: { key: string; def: string }[] = [
  {
    key: 'about.standard.setup',
    def: '10-minute zero-fuss setup — import your customer catalog and dispatch your first truck before your coffee gets cold.',
  },
  {
    key: 'about.standard.math',
    def: 'Honest integer-cent math — flat, predictable subscription and card rates with no buried platform skim.',
  },
  {
    key: 'about.standard.offline',
    def: 'True offline-first field architecture — zero cell service? Complete the work order, snap the photos, capture sign-off. It pushes when you reach daylight.',
  },
  {
    key: 'about.standard.builders',
    def: 'Built by field tradesmen & dispatchers — every layout is clickable with grease on your thumbs and sun glaring off the glass.',
  },
]

/** The 7-step quote-to-cash signature flow. */
const FLOW: { step: string; icon: string; title: string; body: string }[] = [
  {
    step: '01',
    icon: 'request_quote',
    title: 'Quote in secs',
    body: 'Built directly from price-book catalogs or flat-rate assemblies.',
  },
  {
    step: '02',
    icon: 'draw',
    title: 'Send & accept',
    body: 'SMS direct link with instant digital sign-off on the customer’s phone.',
  },
  {
    step: '03',
    icon: 'calendar_today',
    title: 'Auto-schedule',
    body: 'Instant job creation with zero manual re-entry or double booking.',
  },
  {
    step: '04',
    icon: 'navigation',
    title: 'Live route sync',
    body: 'Turn-by-turn navigation and automatic “on my way” customer updates.',
  },
  {
    step: '05',
    icon: 'photo_camera',
    title: 'Field proof',
    body: 'Mandatory checklist and photo check-ins that protect liability.',
  },
  {
    step: '06',
    icon: 'receipt_long',
    title: 'One-tap invoice',
    body: 'Line-item parts and field hours transform into an approved bill.',
  },
  {
    step: '07',
    icon: 'account_balance',
    title: 'Bank deposit',
    body: 'Collected payments settle out to your operating account.',
  },
]

/** The four non-negotiable shop standards. */
const RULES: { key: string; icon: string; title: string; body: string; rule: string }[] = [
  {
    key: 'noHostageData',
    icon: 'database',
    title: 'No Hostage Data',
    body: 'You own every customer record, equipment serial, job photo, and balance. Export your full database as standard CSV at any hour — if you ever leave, you leave with the keys and zero export penalties.',
    rule: 'Zero database export fees. Ever.',
  },
  {
    key: 'basementsHappen',
    icon: 'signal_wifi_bad',
    title: 'Basements Happen',
    body: 'Cell towers don’t penetrate three feet of subterranean concrete, and we know it. The field app keeps working with zero bars — the ticket never hiccups or wipes data.',
    rule: 'Zero network lockouts on sub-surface jobs.',
  },
  {
    key: 'realPeople',
    icon: 'headset_mic',
    title: 'Real People Answer the Phone',
    body: 'No endless phone-tree loops. No ticket queue telling you to wait 72 hours while a water main is flooding a client’s basement. You reach someone who knows what a manifold gauge is.',
    rule: 'Humans on the line, fast pickup goals.',
  },
  {
    key: 'neverSkim',
    icon: 'price_check',
    title: 'Never Skim the Hard Work',
    body: 'Every invoice calculates in honest, predictable integer cents. No buried platform cuts stacked on top of your card processing, no “statement administrative surcharges.” You earned the check; you keep the check.',
    rule: 'Flat subscription + transparent fixed card math.',
  },
]

/** The founding crew. */
const TEAM: { initials: string; name: string; role: string; bio: string }[] = [
  {
    initials: 'FM',
    name: 'Frank Miller',
    role: 'Founder & chief architect',
    bio: 'Ran a 14-van plumbing shop for 18 years before starting Toolbelt — after getting quoted $34,000 for an enterprise system that didn’t even sync inventory.',
  },
  {
    initials: 'SJ',
    name: 'Sarah Jenkins',
    role: 'Head of product operations',
    bio: '15-year commercial HVAC dispatcher who orchestrated multi-state technician routing, and designed the single-screen board to take 100+ emergency calls an hour.',
  },
  {
    initials: 'MK',
    name: 'Marcus King',
    role: 'Field systems lead',
    bio: 'Trained electrical apprentice turned systems engineer. Built the zero-loss offline sync engine that lets techs keep recording jobs in sub-grade mechanical rooms.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'Our story — built in the trades' })}
      title={t(
        'about.heroTitle',
        {},
        {
          defaultValue: 'Built for people with calluses on their hands, not MBAs on their walls.',
        },
      )}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(12))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                'We got fed up with enterprise bloatware charging $5,000 onboarding fees and locking contractors into 3-year contracts. {{appName}} was built from the back of an HVAC van to give real tradesmen software that just works — a job from the first estimate to the deposited check, in one place instead of five.',
            },
          )}
        </p>

        <section data-mol-id="about-restoring" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'about.restoringTitle',
              {},
              {
                defaultValue:
                  'The software industry broke faith with the trades. We’re restoring it.',
              },
            )}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.restoringBody',
              {},
              {
                defaultValue:
                  'Contractors built this country with sweat and steel. You shouldn’t have to mortgage your future just to schedule a tune-up or bill a heat exchanger.',
              },
            )}
          </p>
          <div className={cm.grid({ cols: 2, gap: 'lg' })}>
            <div className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(3))}>
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
                {t('about.oldWay.title', {}, { defaultValue: 'The Old Way' })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-error',
                )}
              >
                {t('about.oldWay.badge', {}, { defaultValue: 'Broken' })}
              </p>
              <ul className={cm.stack(3)}>
                {OLD_WAY.map((item) => (
                  <li key={item.key} className={cm.flex({ align: 'start', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.roundedFull,
                        'h-6 w-6 shrink-0 bg-error-light text-error mt-0.5',
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        cancel
                      </span>
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(item.key, {}, { defaultValue: item.def })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(3), 'border-primary border-2')}
            >
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
                {t('about.standard.title', {}, { defaultValue: 'The Toolbelt Standard' })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-success',
                )}
              >
                {t('about.standard.badge', {}, { defaultValue: 'Honest' })}
              </p>
              <ul className={cm.stack(3)}>
                {STANDARD.map((item) => (
                  <li key={item.key} className={cm.flex({ align: 'start', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.roundedFull,
                        'h-6 w-6 shrink-0 bg-success-container text-on-success-container mt-0.5',
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        check_circle
                      </span>
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(item.key, {}, { defaultValue: item.def })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

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
                  'Blue-collar shops were sold “software” that turned quoting into data entry and dispatching into a whiteboard with a login. We believe a crew of six deserves the same calm tooling as a company of six hundred — every quote, job, and invoice in one place, so the office closes at five and the work still gets billed.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-flow" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.flow.title', {}, { defaultValue: 'The 7-Step Signature Flow' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.flow.blurb',
              {},
              {
                defaultValue:
                  'From the initial ring to settled bank cash without re-typing an address once.',
              },
            )}
          </p>
          <ol className={cm.grid({ cols: 4, gap: 'md' })}>
            {FLOW.map((step) => (
              <li key={step.step} className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      'h-9 w-9 shrink-0 bg-primary-container text-on-primary-container',
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {step.icon}
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'font-mono text-on-surface-variant',
                    )}
                  >
                    {step.step}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(`about.flow.step${step.step}.title`, {}, { defaultValue: step.title })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(`about.flow.step${step.step}.body`, {}, { defaultValue: step.body })}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section data-mol-id="about-workman-rules" className={cm.cn(cm.stack(4))}>
          <div className={cm.stack(2)}>
            <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
              {t('about.rules.title', {}, { defaultValue: 'The Workman Rules' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'about.rules.blurb',
                {},
                {
                  defaultValue:
                    'Non-negotiable shop standards, baked straight into the company bylaws and the product design.',
                },
              )}
            </p>
          </div>
          <div className={cm.grid({ cols: 2, gap: 'lg' })}>
            {RULES.map((rule) => (
              <article key={rule.title} className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(3))}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      'h-10 w-10 shrink-0 bg-primary-container text-on-primary-container',
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      {rule.icon}
                    </span>
                  </span>
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
                    {t(`about.rules.${rule.key}.title`, {}, { defaultValue: rule.title })}
                  </h3>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(`about.rules.${rule.key}.body`, {}, { defaultValue: rule.body })}
                </p>
                <p
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-wider bg-surface-container text-on-surface-variant rounded-md',
                  )}
                >
                  {t(`about.rules.${rule.key}.rule`, {}, { defaultValue: rule.rule })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key} className={'text-on-surface-variant'}>
                {t(f.key, {}, { defaultValue: f.def })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-team" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'about.team.title',
              {},
              { defaultValue: 'Contractors first. Software engineers second.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.team.blurb',
              {},
              {
                defaultValue:
                  'We spent combined decades in service vans, dispatch trailers, and back shops before writing a line of code.',
              },
            )}
          </p>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {TEAM.map((member) => (
              <article key={member.name} className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(3))}>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      'h-11 w-11 shrink-0 font-bold bg-primary-container text-on-primary-container',
                    )}
                    aria-hidden="true"
                  >
                    {member.initials}
                  </span>
                  <div>
                    <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                      {t(
                        `about.team.${member.initials.toLowerCase()}.name`,
                        {},
                        { defaultValue: member.name },
                      )}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant uppercase tracking-wider',
                      )}
                    >
                      {t(
                        `about.team.${member.initials.toLowerCase()}.role`,
                        {},
                        { defaultValue: member.role },
                      )}
                    </p>
                  </div>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    `about.team.${member.initials.toLowerCase()}.bio`,
                    {},
                    { defaultValue: member.bio },
                  )}
                </p>
              </article>
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
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have a question, found a bug, or want to run {{appName}} in your own shop? Reach the team from the Settings page once you are signed in — every message reaches a real person who works on the product.',
              },
            )}
          </p>
        </section>

        <section
          data-mol-id="about-monday-cta"
          className={cm.cn(
            cm.stack(3),
            cm.sp('p', 8),
            'bg-primary-container text-on-primary-container rounded-lg text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'about.cta.title',
              {},
              { defaultValue: 'Get your crew on the same page by Monday morning.' },
            )}
          </h2>
          <p className={cm.cn(cm.prose, 'mx-auto max-w-2xl')}>
            {t(
              'about.cta.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'No sales pitch meetings. No 3-year commitments. Try {{appName}} free for 14 days with your actual crews, trucks, and customers.',
              },
            )}
          </p>
          <div className={cm.flex({ justify: 'center', gap: 'sm', wrap: 'wrap' })}>
            <Link
              to="/signup"
              data-mol-id="about-cta-signup"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md',
              )}
            >
              <span
                className="material-symbols-outlined text-base align-middle mr-1"
                aria-hidden="true"
              >
                bolt
              </span>
              {t('about.cta.signup', {}, { defaultValue: 'Start 14-Day Free Trial' })}
            </Link>
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
