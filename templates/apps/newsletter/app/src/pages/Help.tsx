import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'
import { SafeLink } from '../components/SafeLink.js'

interface FaqEntry {
  id: string
  qKey: string
  qDefault: string
  aKey: string
  aDefault: string
}

const FAQS: FaqEntry[] = [
  {
    id: 'getting-started',
    qKey: 'help.faq.gettingStarted.q',
    qDefault: 'How do I publish my first post?',
    aKey: 'help.faq.gettingStarted.a',
    aDefault:
      'Create an account from the Get started link in the header, then click "New post" on your dashboard. The editor autosaves every keystroke; hit Publish when you are ready, or Schedule for a later date.',
  },
  {
    id: 'analytics',
    qKey: 'help.faq.analytics.q',
    qDefault: 'How does the analytics page work?',
    aKey: 'help.faq.analytics.a',
    aDefault:
      'Every published post tracks views, claps, comments, and reading time in real time. The /analytics page rolls them up into a 30-day chart plus a top-posts table; numbers come straight from the backend, never from sample data.',
  },
  {
    id: 'rss',
    qKey: 'help.faq.rss.q',
    qDefault: 'Is there an RSS feed?',
    aKey: 'help.faq.rss.a',
    aDefault:
      'Yes — every {{appName}} site exposes /api/feed/rss (RSS 2.0) and /api/feed/json (JSON Feed). Both list the most recent published posts with full content for offline readers.',
  },
  {
    id: 'pricing',
    qKey: 'help.faq.pricing.q',
    qDefault: 'What does the Pro tier add?',
    aKey: 'help.faq.pricing.a',
    aDefault:
      'Pro unlocks unlimited drafts, post scheduling, custom-domain hosting, AI summaries, advanced analytics retention, and priority support. You can compare plans on the Pricing page.',
  },
  {
    id: 'support',
    qKey: 'help.faq.support.q',
    qDefault: 'How do I contact support?',
    aKey: 'help.faq.support.a',
    aDefault:
      'Email support@writeflow.example and a real person on the team will get back to you. Pro members get a guaranteed first-response time of one business day.',
  },
]

interface Domain {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  articles: Array<{ key: string; labelDefault: string }>
  moreKey: string
  moreDefault: string
}

/** The six knowledge domains readers can browse (design: Browse by Knowledge Domain). */
const DOMAINS: Domain[] = [
  {
    id: 'getting-started',
    icon: 'move_to_inbox',
    titleKey: 'help.domain.gettingStarted.title',
    titleDefault: 'Getting Started & Migration',
    bodyKey: 'help.domain.gettingStarted.body',
    bodyDefault:
      'Seamlessly import your legacy publication archive and transition readers without disruption.',
    articles: [
      { key: 'a1', labelDefault: 'Setting up your first issue' },
      { key: 'a2', labelDefault: 'Importing CSV subscriber rosters' },
      { key: 'a3', labelDefault: 'Publication custom domain setup' },
    ],
    moreKey: 'help.domain.gettingStarted.more',
    moreDefault: 'View all 14 articles',
  },
  {
    id: 'deliverability',
    icon: 'mark_email_read',
    titleKey: 'help.domain.deliverability.title',
    titleDefault: 'Deliverability & Custom Domains',
    bodyKey: 'help.domain.deliverability.body',
    bodyDefault: 'Master DNS reputation, mailbox placement, and dedicated sending IP health.',
    articles: [
      { key: 'a1', labelDefault: 'Configuring DKIM, SPF & DMARC records' },
      { key: 'a2', labelDefault: 'Dedicated sender IP pools' },
      { key: 'a3', labelDefault: 'Cold list warming recommendations' },
    ],
    moreKey: 'help.domain.deliverability.more',
    moreDefault: 'View all 9 guides',
  },
  {
    id: 'editor',
    icon: 'edit_note',
    titleKey: 'help.domain.editor.title',
    titleDefault: 'Editorial Editor & Craft',
    bodyKey: 'help.domain.editor.body',
    bodyDefault:
      'Compose essays with typography controls, rich media embeds, and distraction-free writing modes.',
    articles: [
      { key: 'a1', labelDefault: 'Distraction-free Markdown guide' },
      { key: 'a2', labelDefault: 'Footnotes & mathematical typesetting' },
      { key: 'a3', labelDefault: 'Custom drop caps & font pairing' },
    ],
    moreKey: 'help.domain.editor.more',
    moreDefault: 'View all 18 articles',
  },
  {
    id: 'monetization',
    icon: 'payments',
    titleKey: 'help.domain.monetization.title',
    titleDefault: 'Subscriptions & Monetization',
    bodyKey: 'help.domain.monetization.body',
    bodyDefault:
      'Retain 100% of the reader relationship with direct payment processing and sustainable tiered memberships.',
    articles: [
      { key: 'a1', labelDefault: 'Setting up founding patron tiers' },
      { key: 'a2', labelDefault: 'Currency localization & tax basics' },
      { key: 'a3', labelDefault: 'Gift subscriptions & comp passes' },
    ],
    moreKey: 'help.domain.monetization.more',
    moreDefault: 'View all 11 articles',
  },
  {
    id: 'portability',
    icon: 'lock_open',
    titleKey: 'help.domain.portability.title',
    titleDefault: 'Subscriber Graph & Portability',
    bodyKey: 'help.domain.portability.body',
    bodyDefault:
      'Complete sovereignty over your audience records, telemetry privacy, and open syndication.',
    articles: [
      { key: 'a1', labelDefault: 'Exporting unencrypted subscriber rosters' },
      { key: 'a2', labelDefault: 'Open RSS feeds & syndication' },
      { key: 'a3', labelDefault: 'Reader privacy & zero tracking pixels' },
    ],
    moreKey: 'help.domain.portability.more',
    moreDefault: 'View all 7 articles',
  },
  {
    id: 'api',
    icon: 'terminal',
    titleKey: 'help.domain.api.title',
    titleDefault: 'API, Webhooks & Extensibility',
    bodyKey: 'help.domain.api.body',
    bodyDefault:
      'Integrate external membership tools, trigger custom webhooks, or publish headlessly.',
    articles: [
      { key: 'a1', labelDefault: 'Headless publishing via the Dispatch API' },
      { key: 'a2', labelDefault: 'Custom webhook listeners for patron events' },
      { key: 'a3', labelDefault: 'Automation flows with Zapier & Make' },
    ],
    moreKey: 'help.domain.api.more',
    moreDefault: 'View all 12 endpoints',
  },
]

interface Guide {
  id: string
  kickerKey: string
  kickerDefault: string
  metaKey: string
  metaDefault: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  updatedKey: string
  updatedDefault: string
}

/** The curated in-depth guides (design: Essential In-Depth Guides). */
const GUIDES: Guide[] = [
  {
    id: 'migration',
    kickerKey: 'help.guides.migration.kicker',
    kickerDefault: 'Migration Handbook',
    metaKey: 'help.guides.migration.meta',
    metaDefault: '8 min read',
    titleKey: 'help.guides.migration.title',
    titleDefault:
      'The 10-Minute Migration: Bringing 20,000+ Readers from Substack without Unsubscribe Drops',
    bodyKey: 'help.guides.migration.body',
    bodyDefault:
      'A play-by-play protocol detailing DNS rollover timing, silent subscriber roster pre-warming, and crafting the introductory “We have moved” manifesto letter.',
    updatedKey: 'help.guides.migration.updated',
    updatedDefault: 'Updated 3 days ago',
  },
  {
    id: 'dmarc',
    kickerKey: 'help.guides.dmarc.kicker',
    kickerDefault: 'Deliverability',
    metaKey: 'help.guides.dmarc.meta',
    metaDefault: '12 min read',
    titleKey: 'help.guides.dmarc.title',
    titleDefault: 'Hardening Your Domain: Step-by-Step DMARC p=reject Implementation',
    bodyKey: 'help.guides.dmarc.body',
    bodyDefault:
      'Stage your SPF, DKIM, and DMARC records so spoofed mail bounces while every legitimate dispatch lands — from monitoring-only through the strictest rejection policy.',
    updatedKey: 'help.guides.dmarc.updated',
    updatedDefault: 'Updated Oct 2024',
  },
  {
    id: 'memberships',
    kickerKey: 'help.guides.memberships.kicker',
    kickerDefault: 'Monetization',
    metaKey: 'help.guides.memberships.meta',
    metaDefault: '10 min read',
    titleKey: 'help.guides.memberships.title',
    titleDefault: 'Structuring Paid Memberships: Lessons from Top 5% Literary Publications',
    bodyKey: 'help.guides.memberships.body',
    bodyDefault:
      'Why high-converting independent publications focus on patron tiers, manuscript annotations, and salon discussion access rather than arbitrary paywalls.',
    updatedKey: 'help.guides.memberships.updated',
    updatedDefault: 'Updated Oct 2024',
  },
]

export function Help() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <LandingTopNavBar />
      <main
        data-mol-id="page-help"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('help.title', {}, { defaultValue: 'How can we assist your publication?' })}
        </h1>
        <p
          data-mol-id="help-intro"
          className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'text-on-surface-variant')}
        >
          {t(
            'help.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                'Foundational documentation, protocol specifications, and editorial best practices — plus the questions we hear most. Cannot find what you need? Email support@writeflow.example and a real person on the team will get back to you.',
            },
          )}
        </p>

        {/* Browse by Knowledge Domain */}
        <section data-mol-id="help-domains" className={cm.cn(cm.sp('mb', 12))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
              cm.sp('mb', 2),
            )}
          >
            {t('help.domains.title', {}, { defaultValue: 'Browse by Knowledge Domain' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}>
            {t(
              'help.domains.subhead',
              {},
              { defaultValue: 'Six modules, from your first import to headless publishing.' },
            )}
          </p>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
            {DOMAINS.map((d) => (
              <div
                key={d.id}
                data-mol-id={`help-domain-${d.id}`}
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
                    {d.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {t(d.titleKey, {}, { defaultValue: d.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(d.bodyKey, {}, { defaultValue: d.bodyDefault })}
                </p>
                <ul className={cm.cn(cm.stack(1), cm.sp('mt', 2))}>
                  {d.articles.map((a) => (
                    <li
                      key={a.key}
                      className={cm.cn(
                        cm.flex({ justify: 'between', align: 'center' }),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      <span>
                        {t(`help.domain.${d.id}.${a.key}`, {}, { defaultValue: a.labelDefault })}
                      </span>
                      <span className={cm.fv5b245ffa + ' text-on-surface-variant'} aria-hidden>
                        chevron_right
                      </span>
                    </li>
                  ))}
                </ul>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                    cm.sp('mt', 2),
                  )}
                >
                  {t(d.moreKey, {}, { defaultValue: d.moreDefault })}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Essential In-Depth Guides */}
        <section data-mol-id="help-guides" className={cm.cn(cm.sp('mb', 12))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
              cm.sp('mb', 2),
            )}
          >
            {t('help.guides.title', {}, { defaultValue: 'Essential In-Depth Guides' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}>
            {t(
              'help.guides.subhead',
              {},
              {
                defaultValue:
                  'Recommended reading before launching or scaling an independent editorial publication.',
              },
            )}
          </p>
          <div className={cm.cn(cm.stack(4))}>
            {GUIDES.map((g) => (
              <article
                key={g.id}
                data-mol-id={`help-guide-${g.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
                )}
              >
                <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-tertiary')}>
                  {t(g.kickerKey, {}, { defaultValue: g.kickerDefault })} ·{' '}
                  {t(g.metaKey, {}, { defaultValue: g.metaDefault })}
                </p>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    "font-['Newsreader'] text-on-surface",
                    cm.sp('my', 2),
                  )}
                >
                  {t(g.titleKey, {}, { defaultValue: g.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(g.bodyKey, {}, { defaultValue: g.bodyDefault })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-tertiary')}>
                  {t(g.updatedKey, {}, { defaultValue: g.updatedDefault })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div id="rss" data-mol-id="help-faq-list" className={cm.stack(8)}>
          {FAQS.map((faq) => (
            <section key={faq.id} data-mol-id={`help-faq-${faq.id}`} className={cm.cn(cm.stack(2))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t(faq.qKey, {}, { defaultValue: faq.qDefault })}
              </h2>
              <p className="text-on-surface-variant">
                {t(faq.aKey, { appName: APP_NAME }, { defaultValue: faq.aDefault })}
              </p>
            </section>
          ))}
        </div>

        {/* Direct writer access — concierge + support desk */}
        <section data-mol-id="help-contact" className={cm.cn(cm.sp('mt', 12))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
              cm.sp('mb', 2),
            )}
          >
            {t(
              'help.contact.title',
              {},
              { defaultValue: 'Still have questions about your publication?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}>
            {t(
              'help.contact.subhead',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is staffed by writers, systems engineers, and typographers. We do not use automated triage bots.',
              },
            )}
          </p>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
            <div
              data-mol-id="help-concierge"
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
                  handshake
                </span>
              </div>
              <h3
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t(
                  'help.contact.concierge.title',
                  {},
                  { defaultValue: 'White-Glove Migration Concierge' },
                )}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'help.contact.concierge.body',
                  {},
                  {
                    defaultValue:
                      'For established publications with over 5,000 active subscribers. Our migration engineers handle DNS validation, custom layout matching, archive re-formatting, and subscriber verification free of charge.',
                  },
                )}
              </p>
              <SafeLink
                data-mol-id="help-concierge-cta"
                to="/signup"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline',
                )}
              >
                {t('help.contact.concierge.cta', {}, { defaultValue: 'Request Migration Call' })}
              </SafeLink>
            </div>
            <div
              data-mol-id="help-support-desk"
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
                  forum
                </span>
              </div>
              <h3
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t('help.contact.desk.title', {}, { defaultValue: 'Author Support Desk' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'help.contact.desk.body',
                  {},
                  {
                    defaultValue:
                      'Direct asynchronous support from real editorial technologists. Average first response time is under 2 hours during weekday publishing hours. We review code, DNS, and formatting questions directly.',
                  },
                )}
              </p>
              <a
                data-mol-id="help-desk-cta"
                href="mailto:support@writeflow.example"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline',
                )}
              >
                {t('help.contact.desk.cta', {}, { defaultValue: 'Message Concierge' })}
              </a>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  )
}

export default Help
export { Help as HelpPage }
