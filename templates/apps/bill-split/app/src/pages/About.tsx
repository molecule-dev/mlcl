import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/* Stitch "Our Philosophy" — the four principles that anchor every split. */
const PRINCIPLES = [
  {
    icon: 'balance',
    title: 'Fairness over Finance',
    body: 'Math must serve human relationships, not the other way around. Everyone pays their exact part — no micro-penalties, no social shame.',
    point: 'Relationship-first design',
  },
  {
    icon: 'celebration',
    title: 'Convivial Simplicity',
    body: 'Every split, item scan, and gentle reminder should feel light, warm, and low-friction. No guilt trips, no clunky invoices, no tension.',
    point: 'Polite automated nudges',
  },
  {
    icon: 'calculate',
    title: 'Mathematical Precision',
    body: 'Zero rounding errors. Penny-exact fractional splitting and graph algorithms that eliminate circular debt across the whole group.',
    point: 'Exact cent parity',
  },
  {
    icon: 'shield_person',
    title: 'Uncompromising Privacy',
    body: 'We never monetize your dining habits, sell personal payment graphs, or run behavioral tracking ads. Your shared moments remain strictly yours.',
    point: 'Zero ad trackers',
  },
] as const

/* Stitch "The Humans Behind Evenly" — the founding team. */
const TEAM = [
  {
    initials: 'ML',
    name: 'Maya Lin',
    role: 'Co-Founder & CEO',
    bio: 'Former fintech product lead. Obsessed with eradicating social frictions in modern consumer experiences.',
    memory: 'Lake Tahoe groceries & firewood organizer',
    tile: 'bg-primary-fixed text-on-primary-fixed',
  },
  {
    initials: 'DP',
    name: 'Dev Patel',
    role: 'Co-Founder & CTO',
    bio: 'Distributed systems researcher. Architect of our zero-overhead combinatorial debt settlement engine.',
    memory: 'Algorithmic debt routing architect',
    tile: 'bg-secondary-fixed text-on-secondary-fixed',
  },
  {
    initials: 'SK',
    name: 'Sam K.',
    role: 'Head of Product Design',
    bio: 'Crafting interfaces that feel as low-pressure as sharing a beverage on a sunny afternoon with friends.',
    memory: 'Joshua Tree sunset dinner bill splitter',
    tile: 'bg-tertiary-fixed text-on-tertiary-fixed',
  },
  {
    initials: 'CT',
    name: 'Clara T.',
    role: 'Head of Engineering',
    bio: 'Ex-payments infrastructure lead ensuring micro-cent accuracy, uptime reliability, and bank-level data encryption.',
    memory: 'Bushwick 4-roommate ledger guru',
    tile: 'bg-surface-container-highest text-on-surface',
  },
] as const

const TRUST_ITEMS = [
  { icon: 'verified_user', title: 'SOC 2 Type II', body: 'Certified compliance' },
  { icon: 'lock', title: '256-Bit TLS', body: 'End-to-end encryption' },
  { icon: 'no_accounts', title: 'Zero Ad Tracking', body: 'Data never sold' },
] as const

const STATS = [
  { value: '$42M+', label: 'settled seamlessly' },
  { value: '140,000+', label: 'groups & roommates' },
  { value: '0', label: 'awkward money chats' },
  { value: '4.9/5', label: 'user satisfaction' },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const card = cm.cn(
    cm.sp('p', 6),
    'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
  )
  const eyebrow = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest text-primary',
  )
  const heading2 = cm.cn(
    cm.textSize('2xl'),
    cm.sp('mt', 2),
    cm.fontWeight('extrabold'),
    'tracking-tight',
  )

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'Our Mission & Story' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', {}, { defaultValue: APP_TAGLINE })}
    >
      {/* Mission — Stitch hero statement */}
      <section className={cm.stack(4)} data-mol-id="about-intro">
        <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('extrabold'), 'tracking-tight')}>
          {t(
            'about.missionTitle',
            {},
            { defaultValue: 'Built to keep shared moments shared, not awkward.' },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} was founded on a simple premise: friends should spend time planning the next ski weekend or sharing dinner, not chasing fourteen messy payment links and fighting over spreadsheets.',
            },
          )}
        </p>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-surface-container-low text-center')}
            >
              <dt className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'text-primary')}>
                {stat.value}
              </dt>
              <dd className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(`about.stat.${stat.label}`, {}, { defaultValue: stat.label })}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Origin story — Stitch "The ski cabin that started it all." */}
      <section className={cm.stack(4)} data-mol-id="about-story">
        <span className={eyebrow}>
          {t('about.storyEyebrow', {}, { defaultValue: 'The Origin Story' })}
        </span>
        <h2 className={heading2}>
          {t('about.storyTitle', {}, { defaultValue: 'The ski cabin that started it all.' })}
        </h2>
        <div className={cm.cn(cm.stack(3), cm.sp('mt', 2))}>
          <p className="text-on-surface-variant leading-relaxed">
            {t(
              'about.storyBody1',
              {},
              {
                defaultValue:
                  'In February 2022, eight close friends drove up to Lake Tahoe for a long-weekend ski trip. The memories were unbeatable: crisp mountain powder, fireside hot cocoa, and epic communal dinners.',
              },
            )}
          </p>
          <p className="text-on-surface-variant leading-relaxed">
            {t(
              'about.storyBody2',
              {},
              {
                defaultValue:
                  "Sunday evening wasn't so warm. Our co-founders Maya and Dev spent nearly four exhausted hours cross-referencing crumpled supermarket receipts, snow-chain rentals, firewood stubs, and eight separate payment-app histories. Someone always felt shortchanged. Someone always forgot who covered the cleaning deposit.",
              },
            )}
          </p>
          <p className="text-on-surface-variant leading-relaxed">
            {t(
              'about.storyBody3',
              { app: APP_NAME },
              {
                defaultValue:
                  'That night, Dev wrote the initial debt-minimization script in the Tahoe passenger seat. Within three weeks, twenty roommate apartments in Brooklyn were using the beta. {{app}} was officially born.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mt', 2))}>
          <span className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')} aria-hidden="true">
            {['ML', 'DP'].map((initials) => (
              <span
                key={initials}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-9 w-9 rounded-full text-xs font-bold ring-2 ring-surface',
                  initials === 'ML'
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-secondary-fixed text-on-secondary-fixed',
                )}
              >
                {initials}
              </span>
            ))}
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'about.storyFounders',
              { app: APP_NAME },
              { defaultValue: 'Maya Lin & Dev Patel — Co-Founders, {{app}}' },
            )}
          </span>
        </div>
      </section>

      {/* Philosophy — Stitch "The principles that anchor every split." */}
      <section className={cm.stack(6)} data-mol-id="about-principles">
        <div>
          <span className={eyebrow}>
            {t('about.philosophyEyebrow', {}, { defaultValue: 'Our Philosophy' })}
          </span>
          <h2 className={heading2}>
            {t(
              'about.philosophyTitle',
              {},
              { defaultValue: 'The principles that anchor every split.' },
            )}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('base'),
              'text-on-surface-variant',
              cm.sp('mt', 3),
              'max-w-2xl',
            )}
          >
            {t(
              'about.philosophyBody',
              {},
              {
                defaultValue:
                  'Financial software has historically treated personal transactions like corporate balance sheets. We build for social harmony first.',
              },
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRINCIPLES.map((principle) => (
            <article key={principle.title} className={card}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(12),
                  cm.h(12),
                  'rounded-xl mb-4 bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')}>
                  {principle.icon}
                </span>
              </div>
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t(`about.principle.${principle.title}`, {}, { defaultValue: principle.title })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                  cm.sp('mt', 2),
                  'leading-relaxed',
                )}
              >
                {t(`about.principleBody.${principle.title}`, {}, { defaultValue: principle.body })}
              </p>
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-primary',
                  cm.sp('mt', 3),
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  check_circle
                </span>
                {t(
                  `about.principlePoint.${principle.title}`,
                  {},
                  { defaultValue: principle.point },
                )}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Proprietary algorithm — Stitch "The Smart Debt Minimizer." */}
      <section className={cm.stack(4)} data-mol-id="about-minimizer">
        <span className={eyebrow}>
          {t('about.minimizerEyebrow', {}, { defaultValue: 'Proprietary Algorithm' })}
        </span>
        <h2 className={heading2}>
          {t('about.minimizerTitle', {}, { defaultValue: 'The Smart Debt Minimizer.' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('base'),
            'text-on-surface-variant leading-relaxed',
            'max-w-3xl',
          )}
        >
          {t(
            'about.minimizerBody',
            { app: APP_NAME },
            {
              defaultValue:
                'When eight friends share a trip, traditional expense apps create up to 28 cross-directional payments. {{app}} runs a non-cyclical network reduction algorithm in real time — reciprocal debts cancel out and the entire group settles in two or three direct transfers.',
            },
          )}
        </p>
        <ul className={cm.cn(cm.stack(2), cm.sp('mt', 2))}>
          {[
            '85% fewer bank transfers between friends',
            'One-tap instant settlement via your preferred payment rail',
            'Polite automated reminders without the cringe',
          ].map((point, i) => (
            <li key={point} className={cm.flex({ align: 'center', gap: 2 })}>
              <span
                className={cm.cn('material-symbols-outlined text-lg text-primary')}
                aria-hidden="true"
              >
                done
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                {t(`about.minimizerPoint.${i}`, {}, { defaultValue: point })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Team — Stitch "Built by chronic group organizers." */}
      <section className={cm.stack(6)} data-mol-id="about-team">
        <div>
          <span className={eyebrow}>
            {t(
              'about.teamEyebrow',
              { app: APP_NAME },
              { defaultValue: 'The Humans Behind {{app}}' },
            )}
          </span>
          <h2 className={heading2}>
            {t('about.teamTitle', {}, { defaultValue: 'Built by chronic group organizers.' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('base'),
              'text-on-surface-variant',
              cm.sp('mt', 3),
              'max-w-2xl',
            )}
          >
            {t(
              'about.teamBody',
              {},
              {
                defaultValue:
                  'We are mathematicians, designers, and lifelong flatmates who have personally organized hundreds of dinner parties, camping escapes, and group vacations.',
              },
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM.map((member) => (
            <article
              key={member.name}
              className={cm.cn(card, cm.flex({ direction: 'col', gap: 3 }))}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(12),
                  cm.h(12),
                  'rounded-full text-sm font-bold',
                  member.tile,
                )}
                aria-hidden="true"
              >
                {member.initials}
              </span>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {t(`about.teamMember.${member.name}`, {}, { defaultValue: member.name })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-primary')}>
                {t(`about.teamRole.${member.name}`, {}, { defaultValue: member.role })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
                {t(`about.teamBio.${member.name}`, {}, { defaultValue: member.bio })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                <span className={cm.fontWeight('bold') + ' block'}>
                  {t('about.teamMemoryLabel', {}, { defaultValue: 'Favorite split memory' })}
                </span>
                {t(`about.teamMemory.${member.name}`, {}, { defaultValue: member.memory })}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Trust — Stitch "Institutional-grade trust for casual moments." */}
      <section className={cm.stack(4)} data-mol-id="about-trust">
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}>
          {t(
            'about.trustTitle',
            {},
            { defaultValue: 'Institutional-grade trust for casual moments.' },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'max-w-2xl')}>
          {t(
            'about.trustBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Your ledger history and account credentials never leave our encrypted perimeter. {{app}} never moves your money — we only compute who owes whom.',
            },
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low',
                cm.flex({ align: 'center', gap: 3 }),
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 shrink-0 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>{item.icon}</span>
              </span>
              <span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'block')}>
                  {t(`about.trust.${item.title}`, {}, { defaultValue: item.title })}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(`about.trustBody.${item.title}`, {}, { defaultValue: item.body })}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — Stitch "Ready to make group splits effortless?" */}
      <section
        data-mol-id="about-cta"
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-3xl bg-gradient-to-br from-primary to-[color:var(--color-surface-tint)] text-on-primary text-center shadow-xl',
        )}
      >
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'tracking-tight')}>
          {t('about.ctaTitle', {}, { defaultValue: 'Ready to make group splits effortless?' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-primary-container', cm.sp('mt', 2))}>
          {t(
            'about.ctaBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Join 140,000+ friends, couples, and roommates who have replaced spreadsheets and awkward reminders with {{app}}.',
            },
          )}
        </p>
        <a
          href="/signup"
          data-mol-id="about-cta-signup"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'mt-6 rounded-xl bg-on-primary text-primary shadow-lg inline-flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]',
          )}
        >
          {t('common.startFree', {}, { defaultValue: 'Get Started Free' })}
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_forward
          </span>
        </a>
      </section>

      <p
        data-mol-id="about-contact"
        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
      >
        {t(
          'about.contactBody',
          { app: APP_NAME },
          {
            defaultValue:
              'Questions, feedback, or a feature request? Reach the {{app}} team from Settings, or write to us any time — every message goes to a real human.',
          },
        )}
      </p>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
