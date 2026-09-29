import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * About — the company page. Mission first ("feedback shouldn't die in a
 * spreadsheet"), then the four operating principles ("The SignalLoop
 * Standard"), the team, and the infrastructure credentials, closing with
 * the trial CTA.
 */
interface Principle {
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const PRINCIPLES: Principle[] = [
  {
    icon: 'group_off',
    titleKey: 'about.principleSeatTaxTitle',
    titleDefault: 'Zero Seat-Tax on Customers',
    bodyKey: 'about.principleSeatTaxBody',
    bodyDefault:
      'We never charge for external customer logins, voters, or feedback submitters. Customer feedback has zero marginal cost; taxing companies per voter directly suppresses critical signals.',
  },
  {
    icon: 'link',
    titleKey: 'about.principleBacklogTitle',
    titleDefault: 'Verifiable Backlog Links',
    bodyKey: 'about.principleBacklogBody',
    bodyDefault:
      'Every public item on our roadmap references a ticket link in your tracker. We do not publish vaporware roadmaps designed solely to satisfy enterprise procurement checklists.',
  },
  {
    icon: 'notifications_active',
    titleKey: 'about.principleClosedLoopTitle',
    titleDefault: 'Real-Time Closed-Loop Delivery',
    bodyKey: 'about.principleClosedLoopBody',
    bodyDefault:
      'When an engineer merges the work and flips the state to "Shipped," every user who requested that feature receives verified release notes in under 60 seconds.',
  },
  {
    icon: 'database',
    titleKey: 'about.principleTelemetryTitle',
    titleDefault: 'ARR & Data Lake Telemetry',
    bodyKey: 'about.principleTelemetryBody',
    bodyDefault:
      "Feedback isn't just thumbs up. We enrich every signal with verified contract ARR and stream continuous telemetry into your warehouse for executive-level attribution.",
  },
]

interface TeamMember {
  name: string
  roleKey: string
  roleDefault: string
  quoteKey: string
  quoteDefault: string
  initials: string
}

const TEAM: TeamMember[] = [
  {
    name: 'Alex Jensen',
    roleKey: 'about.teamAlexRole',
    roleDefault: 'Co-founder & CEO',
    quoteKey: 'about.teamAlexQuote',
    quoteDefault:
      'Product prioritization without dollar attribution is just guessing with an expensive salary.',
    initials: 'AJ',
  },
  {
    name: 'Sarah Koenig',
    roleKey: 'about.teamSarahRole',
    roleDefault: 'Co-founder & CTO',
    quoteKey: 'about.teamSarahQuote',
    quoteDefault:
      'Real-time two-way syncing with Linear and Jira needs to be sub-second and partition-tolerant.',
    initials: 'SK',
  },
  {
    name: 'Marcus Ray',
    roleKey: 'about.teamMarcusRole',
    roleDefault: 'Head of Product Engineering',
    quoteKey: 'about.teamMarcusQuote',
    quoteDefault:
      'Tooling should feel like an instrument: zero layout shift, ultra-dense UI, and zero fluff.',
    initials: 'MR',
  },
  {
    name: 'Rachel Lin',
    roleKey: 'about.teamRachelRole',
    roleDefault: 'Head of Customer Success',
    quoteKey: 'about.teamRachelQuote',
    quoteDefault:
      "Customers don't churn because you didn't build it — they churn because they felt unheard.",
    initials: 'RL',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <Header />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
        </h1>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'leading-snug tracking-tight text-on-surface',
            )}
          >
            {t(
              'about.missionHeadline',
              { appName: APP_NAME },
              {
                defaultValue:
                  "We built {{appName}} because customer feedback shouldn't die in a spreadsheet.",
              },
            )}
          </h2>
          <p
            data-mol-id="about-intro"
            className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Traditional roadmap tools treat customer requests as soft suggestions or vanity upvote contests. {{appName}} turns customer demand directly into a prioritized engineering backlog — public boards where customers post requests, vote for what they need, and follow each idea from planned to shipped.',
              },
            )}
          </p>

          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 4))}>
            {t(
              'about.problemTitle',
              {},
              {
                defaultValue:
                  'Modern software teams ship faster than ever, yet lose touch with the people paying them.',
              },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'about.problemBody',
              {},
              {
                defaultValue:
                  'Every PM knows the routine: sales notes buried in CRM custom fields, high-value feature requests lost in support tickets, and frantic chat DMs from account executives. By the time the signal survives the hand-offs, the "why" has been stripped away — and the backlog is ranked by who asked loudest, not by what moves revenue or retention.',
              },
            )}
          </p>

          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 8))}>
            {t(
              'about.standardTitle',
              { appName: APP_NAME },
              { defaultValue: 'The {{appName}} Standard' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.standardBody',
              {},
              {
                defaultValue:
                  'We operate by four non-negotiable principles engineered to eliminate vanity metrics and rebuild user trust.',
              },
            )}
          </p>
          <div
            data-mol-id="about-principles"
            className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2', cm.sp('mt', 2))}
          >
            {PRINCIPLES.map((p) => (
              <div
                key={p.titleKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/40 bg-surface',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(9),
                    cm.h(9),
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary-container)',
                    color: 'var(--color-primary)',
                  }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
                    {p.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
                >
                  {t(p.titleKey, {}, { defaultValue: p.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(p.bodyKey, {}, { defaultValue: p.bodyDefault })}
                </p>
              </div>
            ))}
          </div>

          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 8))}>
            {t(
              'about.teamTitle',
              {},
              { defaultValue: 'Built by engineers who suffered the problem.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.teamBody',
              {},
              {
                defaultValue:
                  'Our team came from scale-up observability, edge runtime infrastructure, and developer platforms.',
              },
            )}
          </p>
          <div
            data-mol-id="about-team"
            className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2', cm.sp('mt', 2))}
          >
            {TEAM.map((member) => (
              <figure
                key={member.name}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/40',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                    )}
                    style={{
                      backgroundColor: 'var(--color-primary-container)',
                      color: 'var(--color-primary)',
                    }}
                    aria-hidden="true"
                  >
                    {member.initials}
                  </span>
                  <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                    <figcaption
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {member.name}
                    </figcaption>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(member.roleKey, {}, { defaultValue: member.roleDefault })}
                    </span>
                  </div>
                </div>
                <blockquote
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant italic leading-relaxed',
                  )}
                >
                  “{t(member.quoteKey, {}, { defaultValue: member.quoteDefault })}”
                </blockquote>
              </figure>
            ))}
          </div>

          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 8))}>
            {t(
              'about.credentialsTitle',
              {},
              { defaultValue: 'Technical Credentials & Infrastructure' },
            )}
          </h2>
          <p
            data-mol-id="about-credentials"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.credentialsBody',
              {},
              {
                defaultValue:
                  'The portal runs on the same stack it sells: isolated project sandboxes, signed webhooks on every outbound event, encrypted vote telemetry at rest, and continuous compliance monitoring with automated daily test reports. Status, uptime, and incident history are public — a feedback company that hides its own status page would be a contradiction.',
              },
            )}
          </p>

          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 6),
              cm.sp('mt', 8),
              'rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-on-primary',
            )}
          >
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t(
                'about.ctaTitle',
                {},
                { defaultValue: 'Stop guessing. Start building what moves the needle.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-primary/90')}>
              {t(
                'about.ctaBody',
                {},
                {
                  defaultValue:
                    'Join hundreds of product-led engineering teams eliminating feedback chaos. 14-day free trial. No credit card required.',
                },
              )}
            </p>
            <a
              href="/signup"
              data-mol-id="about-cta"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('px', 5),
                cm.sp('py', 3),
                'rounded-full bg-surface text-primary self-start hover:-translate-y-0.5 transition-transform',
              )}
            >
              {t('about.ctaButton', {}, { defaultValue: 'Start free trial' })}
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                arrow_forward
              </span>
            </a>
          </div>

          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p
            data-mol-id="about-contact"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want a board of your own on {{appName}}? Open your Settings to reach the team — every message goes to a real human who reads it.',
              },
            )}
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default About
export { About as AboutPage }
