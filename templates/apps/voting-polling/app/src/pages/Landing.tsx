import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { LiveResultsHero } from '../components/LiveResultsHero.js'

const FEATURES = [
  {
    key: 'live',
    icon: 'sensors',
    defaultTitle: 'Live results, instant tally',
    defaultBody:
      'Watch ballots arrive in real time. Animated bars, tabular percentages, and quorum-met indicators keep the room oriented.',
  },
  {
    key: 'quorum',
    icon: 'how_to_vote',
    defaultTitle: 'Quorum that proves itself',
    defaultBody:
      'Eligibility rolls, weighted votes, and audit logs make every result defensible. Export a signed PDF in one click.',
  },
  {
    key: 'qa',
    icon: 'forum',
    defaultTitle: 'Audience Q&A on stage',
    defaultBody:
      'Crowd-sourced questions sorted by upvotes. Promote one to the projector. Mark answered. Move on.',
  },
  {
    key: 'transparency',
    icon: 'verified',
    defaultTitle: 'Transparent by design',
    defaultBody:
      'Public results pages, immutable timestamps, and per-vote receipts. Trust is in the timeline, not the takeaway.',
  },
] as const

// The design's "Enterprise-grade consensus" trust band: three pillars for
// governance-heavy organizations.
const ENTERPRISE_PILLARS = [
  {
    key: 'liveResults',
    icon: 'bar_chart',
    titleFallback: 'Live Results',
    bodyFallback:
      'Watch consensus build in real-time with responsive, animated charts that update instantly.',
  },
  {
    key: 'quorumControl',
    icon: 'check_circle',
    titleFallback: 'Quorum Control',
    bodyFallback:
      'Automatically enforce attendance and voting thresholds before closing critical motions.',
  },
  {
    key: 'auditable',
    icon: 'shield',
    titleFallback: 'Auditable',
    bodyFallback:
      'Cryptographically secure logs ensure every vote is counted accurately and traceable if contested.',
  },
] as const

const PRICING = [
  {
    key: 'free',
    title: 'Free',
    price: 'Free',
    blurb: 'For small boards, classrooms, and community groups.',
    bullets: ['5 active polls', 'Live results', 'Audience Q&A', 'Community support'],
    cta: 'Start free',
  },
  {
    key: 'pro',
    title: 'Pro',
    price: '$15',
    period: '/mo',
    blurb: 'For event hosts and conference organizers running concurrent polls.',
    bullets: ['500 polls', 'Presenter mode', 'CSV/JSON exports', 'Advanced analytics'],
    cta: 'Start with Pro',
    featured: true,
  },
  {
    key: 'team',
    title: 'Team',
    price: '$49',
    period: '/mo',
    blurb: 'For unions, HOAs, and shareholder meetings that need governance.',
    bullets: [
      'Unlimited polls',
      'Unlimited data retention',
      'Immutable audit log',
      'Priority support',
    ],
    cta: 'Start with Team',
  },
] as const

const SOCIAL_PROOF = [
  { defaultLabel: 'Hartford City Council', key: 'hartford' },
  { defaultLabel: 'Northbridge HOA', key: 'northbridge' },
  { defaultLabel: 'Polaris Tech Conf', key: 'polaris' },
  { defaultLabel: 'Foundry Co-op', key: 'foundry' },
] as const

const STATS_STRIP = [
  { key: 'votes', value: '2M+', defaultLabel: 'Votes Cast' },
  { key: 'orgs', value: '500+', defaultLabel: 'Organizations' },
  { key: 'audit', value: '98%', defaultLabel: 'Audit Rate' },
] as const

const STAGE_RESULTS = [
  { key: 'product', label: 'Product Development', pct: 54, leading: true },
  { key: 'marketing', label: 'Marketing Expansion', pct: 31, leading: false },
] as const

const SAMPLE_OPTIONS = [
  { id: 'a', label: 'Approve revised charter', votes: 412 },
  { id: 'b', label: 'Send back for amendments', votes: 168 },
  { id: 'c', label: 'Abstain', votes: 47 },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <BrandWordmark size="lg" />
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-full bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start a poll' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 16),
            'relative overflow-hidden lg:py-24',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-secondary-fixed/15 blur-3xl',
            )}
          />
          <div className={cm.cn('relative grid gap-12 lg:grid-cols-2 lg:items-center')}>
            <div>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  // text-primary (#0e7490) on primary/10-over-white is 4.40:1 —
                  // the darker primary-dark (#155e75) is 5.97:1 on that tint.
                  'inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary-dark text-[10px] font-black uppercase tracking-widest',
                )}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  campaign
                </span>
                {t('landing.eyebrow', {}, { defaultValue: 'Live polling, audited results' })}
              </span>
              <h1
                className={cm.cn(
                  cm.sp('mt', 5),
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.heroTitle',
                  { tagline: APP_TAGLINE },
                  { defaultValue: 'Every voice counted.' },
                )}
              </h1>
              <p
                className={cm.cn(
                  cm.sp('mt', 6),
                  cm.textSize('lg'),
                  cm.maxW('xl'),
                  'leading-relaxed font-medium text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'Live polls, board votes, and audience Q&A in one moderation console. Real-time tallies, defensible quorum, and presenter-ready projection — built for the people who run the room.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.sp('mt', 8),
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                )}
              >
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'px-7 py-3.5 rounded-full bg-primary text-on-primary shadow-md shadow-primary/20 hover:bg-primary-dark transition-colors',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start a poll free' })}
                </Link>
                <Link
                  to="/dashboard"
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    'px-6 py-3.5 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors',
                  )}
                >
                  {t('landing.heroSecondary', {}, { defaultValue: 'See live demo →' })}
                </Link>
              </div>
              <p
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('xs'),
                  'font-medium text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroProof',
                  {},
                  {
                    defaultValue:
                      'No credit card required. Upgrade any time as your assembly grows.',
                  },
                )}
              </p>
            </div>

            <div className="relative">
              <LiveResultsHero
                eyebrow={t(
                  'landing.previewEyebrow',
                  {},
                  { defaultValue: 'Hartford · Charter Vote' },
                )}
                title={t(
                  'landing.previewTitle',
                  {},
                  { defaultValue: 'Adopt the revised 2026 charter?' },
                )}
                totalVotes={627}
                state="live"
                options={SAMPLE_OPTIONS}
                caption={t(
                  'landing.previewCaption',
                  {},
                  { defaultValue: 'Quorum 78% met · closes in 6m 14s' },
                )}
              />
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 6))}>
          <p
            className={cm.cn(
              cm.textCenter,
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('landing.socialEyebrow', {}, { defaultValue: 'Trusted by organizers at' })}
          </p>
          <div
            className={cm.cn(
              cm.sp('mt', 4),
              cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
              // No opacity-* here: it composites the muted token down to
              // ~3.5:1 on the card tint (axe color-contrast). The muted look
              // IS text-on-surface-variant (#475569, ≥6.9:1 on these tints).
            )}
          >
            {SOCIAL_PROOF.map((s) => (
              <span
                key={s.key}
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-bold tracking-tight text-on-surface-variant',
                )}
              >
                {t(`landing.social.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </span>
            ))}
          </div>
        </section>

        <section
          className={cm.cn('bg-[var(--quorum-stats-bg)]')}
          aria-label={t('landing.statsStrip.label', {}, { defaultValue: 'Quorum in numbers' })}
        >
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:divide-x divide-[var(--quorum-stats-divide)]',
            )}
          >
            {STATS_STRIP.map((s, i) => (
              <div key={s.key} className={cm.cn('text-center', i > 0 && 'md:pl-8')}>
                <p
                  className={cm.cn(
                    'text-4xl lg:text-5xl font-black text-white tabular-nums tracking-tight mb-2',
                  )}
                >
                  {s.value}
                </p>
                <p className={cm.cn('text-lg font-medium text-[var(--quorum-stats-label)]')}>
                  {t(`landing.statsStrip.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Enterprise trust — the design's "Enterprise-grade consensus" band */}
        <section
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}
          aria-label={t(
            'landing.enterprise.heading',
            {},
            { defaultValue: 'Enterprise-grade consensus' },
          )}
        >
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 10))}>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('landing.enterprise.heading', {}, { defaultValue: 'Enterprise-grade consensus' })}
            </h2>
            <p
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('base'),
                'font-medium text-on-surface-variant',
              )}
            >
              {t(
                'landing.enterprise.subheading',
                {},
                {
                  defaultValue:
                    'Built for organizations that require absolute certainty in their decision-making processes.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
            {ENTERPRISE_PILLARS.map((p) => (
              <div
                key={p.key}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'start', gap: 'sm' }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded-xl bg-primary-container text-primary',
                  )}
                >
                  <span className="material-symbols-outlined text-2xl">{p.icon}</span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t(`landing.enterprise.${p.key}Title`, {}, { defaultValue: p.titleFallback })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.enterprise.${p.key}Body`, {}, { defaultValue: p.bodyFallback })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              {t('landing.featuresEyebrow', {}, { defaultValue: 'How it works' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('4xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Defensible decisions in minutes.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('base'),
                'font-medium text-on-surface-variant',
              )}
            >
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Four pillars take a meeting from "show of hands" to a fully-audited result.',
                },
              )}
            </p>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
              >
                <span
                  className={cm.cn(
                    'inline-flex p-2 rounded-lg bg-primary/10 text-primary material-symbols-outlined text-[28px]',
                  )}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <h3
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.textSize('sm'),
                    'leading-relaxed text-on-surface-variant',
                  )}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('bg-[var(--quorum-stage-bg)] text-white')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
            <div className={cm.cn(cm.textCenter, 'mb-12')}>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--quorum-stage-accent)]">
                {t('landing.stage.eyebrow', {}, { defaultValue: 'Presenter mode' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 3),
                  cm.textSize('4xl'),
                  'font-extrabold tracking-tight',
                )}
              >
                {t('landing.stage.title', {}, { defaultValue: 'Command the room.' })}
              </h2>
              <p
                className={cm.cn(
                  cm.sp('mt', 3),
                  cm.textSize('base'),
                  'text-[var(--quorum-stage-dim)]',
                )}
              >
                {t(
                  'landing.stage.subtitle',
                  {},
                  {
                    defaultValue:
                      'Projected in 4K with a dedicated presenter toolbar for total control.',
                  },
                )}
              </p>
            </div>
            <div
              data-mol-id="landing-stage-mock"
              className={cm.cn(
                'mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[var(--quorum-stage-bg)] shadow-2xl overflow-hidden',
              )}
              aria-hidden="true"
            >
              <div className={cm.cn('px-8 pt-12 pb-8')}>
                <h3 className={cm.cn('text-2xl md:text-3xl font-bold text-center mb-10')}>
                  {t(
                    'landing.stage.question',
                    {},
                    { defaultValue: 'Which initiative should we prioritize?' },
                  )}
                </h3>
                <div className={cm.cn('space-y-6 max-w-3xl mx-auto')}>
                  {STAGE_RESULTS.map((r) => (
                    <div key={r.key} className="relative">
                      <div
                        className={cm.cn(
                          'flex justify-between items-center relative z-10 px-4 pt-2',
                        )}
                      >
                        <span className="font-medium text-lg">
                          {t(`landing.stage.option.${r.key}`, {}, { defaultValue: r.label })}
                        </span>
                        <span className="font-bold tabular-nums text-lg">{r.pct}%</span>
                      </div>
                      <div
                        className={cm.cn(
                          'h-12 rounded-lg w-full overflow-hidden absolute inset-0 bg-[var(--quorum-stage-surface)]',
                        )}
                      >
                        <div
                          className={cm.cn('h-full transition-all duration-500 ease-in-out')}
                          style={{
                            width: `${r.pct}%`,
                            background: r.leading
                              ? 'var(--quorum-stage-bar1)'
                              : 'var(--quorum-stage-bar2)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className={cm.cn(
                  'border-t border-white/10 px-8 py-4 flex flex-wrap justify-between items-center gap-4',
                )}
              >
                <div className={cm.cn('flex items-center gap-6 text-[var(--quorum-stage-text)]')}>
                  <span className={cm.cn('flex items-center gap-2')}>
                    <span className="material-symbols-outlined text-[20px]">pause</span>
                    {t('landing.stage.pause', {}, { defaultValue: 'Pause' })}
                  </span>
                  <span className={cm.cn('flex items-center gap-2')}>
                    <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                    {t('landing.stage.hide', {}, { defaultValue: 'Hide Results' })}
                  </span>
                </div>
                <span className="text-2xl font-bold tabular-nums text-[var(--quorum-stage-accent)]">
                  01:45
                </span>
                <div className={cm.cn('flex items-center gap-4')}>
                  <span className="font-medium tabular-nums text-[var(--quorum-stage-dim)]">
                    {t(
                      'landing.stage.responses',
                      { count: 482 },
                      { defaultValue: '482 responses' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      'px-6 py-2 rounded-lg font-medium text-white bg-[var(--quorum-stage-bar2)]',
                    )}
                  >
                    {t('landing.stage.close', {}, { defaultValue: 'Close Poll' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('4xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('landing.pricingHeading', {}, { defaultValue: 'Plans for every assembly.' })}
            </h2>
          </div>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {PRICING.map((p) => {
              const featured = 'featured' in p && p.featured
              return (
                <div
                  key={p.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-2xl border transition-all',
                    featured
                      ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary border-primary shadow-md shadow-primary/20'
                      : 'bg-surface-container-lowest border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.label`, {}, { defaultValue: p.title })}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 3), 'flex items-baseline gap-2')}>
                    <span
                      className={cm.cn(
                        cm.textSize('4xl'),
                        'font-extrabold tracking-tight tabular-nums',
                        featured ? 'text-on-primary' : 'text-on-surface',
                      )}
                    >
                      {p.price}
                    </span>
                    {'period' in p && p.period ? (
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          'font-semibold',
                          featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                        )}
                      >
                        {p.period}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.textSize('sm'),
                      'font-medium',
                      featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.blurb`, {}, { defaultValue: p.blurb })}
                  </p>
                  <ul className={cm.cn(cm.sp('mt', 6), cm.stack(3))}>
                    {p.bullets.map((b, i) => (
                      <li
                        key={i}
                        className={cm.cn(
                          cm.flex({ align: 'start', gap: 'sm' }),
                          cm.textSize('sm'),
                          featured ? 'text-on-primary' : 'text-on-surface',
                        )}
                      >
                        <span
                          className={cm.cn(
                            'material-symbols-outlined text-[18px] mt-0.5',
                            featured ? 'text-on-primary/80' : 'text-primary',
                          )}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        <span>
                          {t(`landing.plan.${p.key}.bullet${i}`, {}, { defaultValue: b })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('mt', 8),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'block rounded-xl transition-all',
                      featured
                        ? 'bg-surface/95 text-primary hover:bg-surface'
                        : 'bg-primary/10 text-primary hover:bg-primary/15',
                    )}
                  >
                    {t(`landing.plan.${p.key}.cta`, {}, { defaultValue: p.cta })}
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          'bg-[var(--quorum-footer-bg)] text-[var(--quorum-footer-muted)] border-t border-white/10',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-12 flex flex-col md:flex-row justify-between gap-8',
          )}
        >
          <div className={cm.cn(cm.stack(3))}>
            {/* footer lockup: shared BrandWordmark (footer variant keeps the
                per-page brand-wordmark e2e contract header-scoped) */}
            <BrandWordmark as="span" size="md" invert footer />
            <p className={cm.cn(cm.textSize('sm'), 'tracking-wide max-w-md')}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-[var(--quorum-footer-fg)]"
              >
                Molecule.dev
              </a>
            </p>
          </div>
          <nav
            className={cm.cn(
              cm.flex({ gap: 'lg', wrap: 'wrap' }),
              cm.textSize('sm'),
              'tracking-wide md:justify-end',
            )}
          >
            <Link to="/about" className="hover:text-[var(--quorum-footer-hover)] transition-colors">
              {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
            </Link>
            <Link
              to="/pricing"
              className="hover:text-[var(--quorum-footer-hover)] transition-colors"
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/privacy"
              className="hover:text-[var(--quorum-footer-hover)] transition-colors"
            >
              {t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to="/terms" className="hover:text-[var(--quorum-footer-hover)] transition-colors">
              {t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' })}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
