import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'
import { SafeLink } from '../components/SafeLink.js'

interface Stat {
  id: string
  icon: string
  valueKey: string
  valueDefault: string
  labelKey: string
  labelDefault: string
  bodyKey: string
  bodyDefault: string
}

/** "By the numbers" band (design: A Quiet Sanctuary, Scaled Worldwide). */
const STATS: Stat[] = [
  {
    id: 'publications',
    icon: 'auto_stories',
    valueKey: 'about.stats.publications.value',
    valueDefault: '14.2k',
    labelKey: 'about.stats.publications.label',
    labelDefault: 'Active Publications',
    bodyKey: 'about.stats.publications.body',
    bodyDefault: 'Independent essayists and critics spanning 130 countries.',
  },
  {
    id: 'earnings',
    icon: 'savings',
    valueKey: 'about.stats.earnings.value',
    valueDefault: '$42M',
    labelKey: 'about.stats.earnings.label',
    labelDefault: 'Creator Earnings',
    bodyKey: 'about.stats.earnings.body',
    bodyDefault: 'Direct member payouts with a transparent flat platform fee.',
  },
  {
    id: 'inbox',
    icon: 'mark_email_read',
    valueKey: 'about.stats.inbox.value',
    valueDefault: '99.4%',
    labelKey: 'about.stats.inbox.label',
    labelDefault: 'Primary Inbox Rate',
    bodyKey: 'about.stats.inbox.body',
    bodyDefault: 'Dedicated sending infrastructure for clean, literary newsletters.',
  },
  {
    id: 'reads',
    icon: 'visibility',
    valueKey: 'about.stats.reads.value',
    valueDefault: '48M+',
    labelKey: 'about.stats.reads.label',
    labelDefault: 'Monthly Reads',
    bodyKey: 'about.stats.reads.body',
    bodyDefault: 'Delivered and measured with privacy-first, opt-in analytics.',
  },
]

interface Principle {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

/** The four longevity principles (design: Principles Crafted for Longevity). */
const PRINCIPLES: Principle[] = [
  {
    id: 'no-algorithms',
    icon: 'filter_alt_off',
    titleKey: 'about.principles.noAlgorithms.title',
    titleDefault: 'Zero Algorithmic Interference',
    bodyKey: 'about.principles.noAlgorithms.body',
    bodyDefault:
      'We don’t throttle distribution to force upgrades. When you hit publish, your dispatch lands in your subscribed readers’ inboxes, unaltered and chronologically delivered.',
  },
  {
    id: 'typography',
    icon: 'format_paint',
    titleKey: 'about.principles.typography.title',
    titleDefault: 'Obsessive Typographic Craft',
    bodyKey: 'about.principles.typography.body',
    bodyDefault:
      'Our reading canvas follows classic literary book ratios: a 680-pixel reading column, optical serifs, baseline-locked line-height, and tailored dark and light paper surfaces.',
  },
  {
    id: 'portability',
    icon: 'folder_zip',
    titleKey: 'about.principles.portability.title',
    titleDefault: 'Audience Portability & Open Standards',
    bodyKey: 'about.principles.portability.body',
    bodyDefault:
      'Your subscriber graph belongs exclusively to you. Take your full subscriber list, billing history, and Markdown archives anywhere, anytime — open RSS is supported out of the box.',
  },
  {
    id: 'economics',
    icon: 'account_balance',
    titleKey: 'about.principles.economics.title',
    titleDefault: 'Transparent, Moral Economics',
    bodyKey: 'about.principles.economics.body',
    bodyDefault:
      'No predatory revenue splits. Free tiers are free forever; paid plans are a flat software fee. When you succeed, we earn our keep — nothing more, nothing hidden.',
  },
]

interface TeamMember {
  id: string
  nameKey: string
  nameDefault: string
  roleKey: string
  roleDefault: string
  bioKey: string
  bioDefault: string
  tagKey: string
  tagDefault: string
}

/** The custodians (design: Built by Authors, Editors & Systems Thinkers). */
const TEAM: TeamMember[] = [
  {
    id: 'helena',
    nameKey: 'about.team.helena.name',
    nameDefault: 'Helena Vance',
    roleKey: 'about.team.helena.role',
    roleDefault: 'Editor-in-Chief & Co-Founder',
    bioKey: 'about.team.helena.bio',
    bioDefault:
      'Former senior editor and literary essayist. Helena stewards the publishing standards and the editorial fellowship program.',
    tagKey: 'about.team.helena.tag',
    tagDefault: 'Author of Open Margins',
  },
  {
    id: 'marcus',
    nameKey: 'about.team.marcus.name',
    nameDefault: 'Marcus Cole',
    roleKey: 'about.team.marcus.role',
    roleDefault: 'Head of Product & Typography',
    bioKey: 'about.team.marcus.bio',
    bioDefault:
      'Distraction-free writing environments alumnus. Marcus shapes the responsive editorial engine and reader legibility.',
    tagKey: 'about.team.marcus.tag',
    tagDefault: 'Typographic Fellow',
  },
  {
    id: 'sarah',
    nameKey: 'about.team.sarah.name',
    nameDefault: 'Sarah Lin',
    roleKey: 'about.team.sarah.role',
    roleDefault: 'Infrastructure & Mail Architect',
    bioKey: 'about.team.sarah.bio',
    bioDefault:
      'Longtime contributor to open SMTP standards and encrypted protocol pipelines. Sarah keeps inbox placement across major mail providers.',
    tagKey: 'about.team.sarah.tag',
    tagDefault: 'IETF Contributor',
  },
]

interface CompactItem {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

/** The Dispatch Compact — three plain pledges (design). */
const COMPACT: CompactItem[] = [
  {
    id: 'ownership',
    titleKey: 'about.compact.ownership.title',
    titleDefault: 'Absolute List Ownership',
    bodyKey: 'about.compact.ownership.body',
    bodyDefault:
      'Export your subscriber roster and records with one click, at any moment. You are never locked in.',
  },
  {
    id: 'no-ads',
    titleKey: 'about.compact.noAds.title',
    titleDefault: 'Zero Ad-Network Bloat',
    bodyKey: 'about.compact.noAds.body',
    bodyDefault:
      'No scripts tracking reader behavior across tabs. No targeted third-party banner slots inside your essays.',
  },
  {
    id: 'markdown',
    titleKey: 'about.compact.markdown.title',
    titleDefault: 'Plain Markdown Precision',
    bodyKey: 'about.compact.markdown.body',
    bodyDefault:
      'Write without sluggish drag-and-drop builders. Pure text, beautiful serif defaults, and instant web rendering.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
        </h1>

        {/* The Manifesto — A Return to Clarity */}
        <section data-mol-id="about-manifesto" className={cm.cn(cm.stack(4), cm.sp('mb', 10))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('about.manifesto.title', {}, { defaultValue: 'A Return to Clarity' })}
          </h2>
          <p data-mol-id="about-intro" className="prose text-on-surface-variant">
            {t(
              'about.manifesto.p1',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Two decades ago, the open web held a sacred promise: an unmediated space where thoughtful essays, fearless investigations, and quiet reflections could travel directly from author to reader. Somewhere along the path of corporate capture, the literary web was flattened into “content” — sentences became hooks, and writers were trained to perform for automated feedback loops rather than speak directly to their readers.',
              },
            )}
          </p>
          <blockquote className="pl-4 border-l-2 border-primary italic font-headline text-tertiary leading-relaxed">
            {t(
              'about.manifesto.quote',
              {},
              {
                defaultValue:
                  '“When you remove the noise of the feed, what remains is the pure, quiet intimacy of the written word.”',
              },
            )}
          </blockquote>
          <p className="prose text-on-surface-variant">
            {t(
              'about.manifesto.p2',
              { appName: APP_NAME },
              {
                defaultValue:
                  'We built {{appName}} as a counter-revolution. We believe the inbox remains the last truly sovereign, quiet space on the consumer internet — and we give writers the modern editorial tools to honor that invitation: razor-sharp typography, zero opaque recommendation engines, 100% list portability, and economics aligned strictly with your craft.',
              },
            )}
          </p>
        </section>

        {/* The Dispatch Compact */}
        <section data-mol-id="about-compact" className={cm.cn(cm.stack(4), cm.sp('mb', 10))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('about.compact.title', {}, { defaultValue: 'The Dispatch Compact' })}
          </h2>
          <div className={cm.cn(cm.stack(3))}>
            {COMPACT.map((c) => (
              <div
                key={c.id}
                className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}
                data-mol-id={`about-compact-${c.id}`}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-8 h-8 shrink-0 rounded-sm bg-primary-fixed text-primary',
                  )}
                >
                  <span className={cm.fv5b245ffa} aria-hidden>
                    check_circle
                  </span>
                </span>
                <div>
                  <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {t(c.titleKey, {}, { defaultValue: c.titleDefault })}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(c.bodyKey, {}, { defaultValue: c.bodyDefault })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* By the numbers */}
        <section data-mol-id="about-numbers" className={cm.cn(cm.stack(4), cm.sp('mb', 10))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('about.numbers.title', {}, { defaultValue: 'A Quiet Sanctuary, Scaled Worldwide' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'sm:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.id}
                data-mol-id={`about-stat-${s.id}`}
                className={cm.cn(
                  cm.stack(1),
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-8 h-8 rounded-sm bg-primary-fixed text-primary',
                  )}
                >
                  <span className={cm.fv5b245ffa} aria-hidden>
                    {s.icon}
                  </span>
                </span>
                <p
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    "font-['Newsreader'] text-on-surface",
                  )}
                >
                  {t(s.valueKey, {}, { defaultValue: s.valueDefault })}
                </p>
                <p
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t(s.labelKey, {}, { defaultValue: s.labelDefault })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles Crafted for Longevity */}
        <section data-mol-id="about-principles" className={cm.cn(cm.stack(4), cm.sp('mb', 10))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('about.principles.title', {}, { defaultValue: 'Principles Crafted for Longevity' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.principles.subhead',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Every design decision in {{appName}} is weighed against calm reading and authorial autonomy.',
              },
            )}
          </p>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
            {PRINCIPLES.map((p) => (
              <div
                key={p.id}
                data-mol-id={`about-principle-${p.id}`}
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-9 h-9 rounded-sm bg-primary-fixed text-primary',
                  )}
                >
                  <span className={cm.fv5b245ffa} aria-hidden>
                    {p.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {t(p.titleKey, {}, { defaultValue: p.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(p.bodyKey, {}, { defaultValue: p.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Leadership & custodians */}
        <section data-mol-id="about-team" className={cm.cn(cm.stack(4), cm.sp('mb', 10))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t(
              'about.team.title',
              {},
              { defaultValue: 'Built by Authors, Editors & Systems Thinkers' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.team.subhead',
              {},
              {
                defaultValue:
                  'Our team came from the world’s leading publications and open typography laboratories.',
              },
            )}
          </p>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-3')}>
            {TEAM.map((m) => (
              <div
                key={m.id}
                data-mol-id={`about-team-${m.id}`}
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {t(m.nameKey, {}, { defaultValue: m.nameDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary')}>
                  {t(m.roleKey, {}, { defaultValue: m.roleDefault })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(m.bioKey, {}, { defaultValue: m.bioDefault })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'italic text-tertiary')}>
                  {t(m.tagKey, {}, { defaultValue: m.tagDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section
          data-mol-id="about-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-xl bg-surface-container-lowest border border-surface-container-highest text-center',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
              cm.sp('mb', 2),
            )}
          >
            {t(
              'about.cta.title',
              {},
              { defaultValue: 'Ready to own your audience and speak with clarity?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-on-surface-variant')}>
            {t(
              'about.cta.body',
              {},
              {
                defaultValue:
                  'Create your custom publication today. Import existing archives in a single click — no credit card required.',
              },
            )}
          </p>
          <SafeLink
            data-mol-id="about-cta-button"
            to="/signup"
            className={cm.cn(
              'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-6 py-3',
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
            )}
          >
            {t('about.cta.button', {}, { defaultValue: 'Start Writing Free' })}
          </SafeLink>
        </section>
      </main>
      <LandingFooter />
    </>
  )
}

export default About
export { About as AboutPage }
