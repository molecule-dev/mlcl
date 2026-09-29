import { useEffect } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Feature blurbs for the About page — one per capability pillar.
 * Construction domain copy kept app-agnostic (no vendor names).
 */
const FEATURES = [
  {
    icon: 'edit_note',
    titleKey: 'about.feature.dailyLogs.title',
    titleDefault: 'Daily logs',
    bodyKey: 'about.feature.dailyLogs.body',
    bodyDefault:
      'File the day in minutes: date, weather, crew on site, and work performed per area — with delays and notes preserved exactly as written.',
  },
  {
    icon: 'checklist',
    titleKey: 'about.feature.punch.title',
    titleDefault: 'Punch lists',
    bodyKey: 'about.feature.punch.body',
    bodyDefault:
      'Walk the job and file punch items at plan locations, sorted by severity. Assign them, attach a photo, and close them out with a timestamp.',
  },
  {
    icon: 'forum',
    titleKey: 'about.feature.rfis.title',
    titleDefault: 'RFIs',
    bodyKey: 'about.feature.rfis.body',
    bodyDefault:
      'Raise questions against drawing references, thread answers and clarifications, and mark the final answer that the whole team builds to.',
  },
  {
    icon: 'group',
    titleKey: 'about.feature.subs.title',
    titleDefault: 'Subcontractors',
    bodyKey: 'about.feature.subs.body',
    bodyDefault:
      'Keep the trade directory per project: company, contact, contract value, and whether they are invited, active, or terminated.',
  },
  {
    icon: 'photo_camera',
    titleKey: 'about.feature.photos.title',
    titleDefault: 'Photo documentation',
    bodyKey: 'about.feature.photos.body',
    bodyDefault:
      'Attach photo references to punch items so the condition at closeout is documented, not described.',
  },
  {
    icon: 'trending_up',
    titleKey: 'about.feature.overview.title',
    titleDefault: 'Project overview',
    bodyKey: 'about.feature.overview.body',
    bodyDefault:
      'Phase, budget, and progress on every jobsite, with open-RFI aging and punch severity always in view on the dashboard.',
  },
] as const

/** The four non-negotiables — the design's operating principles. */
const NON_NEGOTIABLES = [
  {
    icon: 'bolt',
    bg: 'bg-primary-container text-on-primary-container',
    key: 'about.nonNegotiable.foremen.title',
    def: 'Zero Friction for the Foremen',
    bodyKey: 'about.nonNegotiable.foremen.body',
    bodyDef:
      'A super with muddy gloves files the day’s log in under two minutes. If the tool needs a training video, it does not belong on the deck.',
  },
  {
    icon: 'cloud_off',
    bg: 'bg-secondary-container text-on-secondary-container',
    key: 'about.nonNegotiable.autonomy.title',
    def: 'Sub-Basement Autonomy',
    bodyKey: 'about.nonNegotiable.autonomy.body',
    bodyDef:
      'Real construction happens in concrete bunkers and deep shafts where coverage dies. Offline-first is the foundational protocol, not an afterthought — the field keeps working and syncs when it resurfaces.',
  },
  {
    icon: 'group_add',
    bg: 'bg-tertiary-container text-on-tertiary-container',
    key: 'about.nonNegotiable.seatTax.title',
    def: 'No Seat Taxes on Trade Subs',
    bodyKey: 'about.nonNegotiable.seatTax.body',
    bodyDef:
      'Charging per user incentivizes leaving electricians and finishers out of the single source of truth — and that omission is where rework and injuries come from. Trade access is unlimited and free.',
  },
  {
    icon: 'speed',
    bg: 'bg-error-container text-on-error-container',
    key: 'about.nonNegotiable.velocity.title',
    def: 'Sub-Second Drawing Velocity',
    bodyKey: 'about.nonNegotiable.velocity.body',
    bodyDef:
      'A crew member standing at a slab edge cannot wait on a spinner. Sheets open fast, pan smooth, and load the next revision before it is asked for.',
  },
] as const

/** The team — the design's builders roster. */
const TEAM = [
  {
    key: 'about.team.marcus.name',
    name: 'Marcus Vance',
    roleKey: 'about.team.marcus.role',
    roleDef: 'Sr. General Superintendent · Co-founder',
    bioKey: 'about.team.marcus.bio',
    bioDef:
      'Twenty-two years running high-rise concrete cores, including five mixed-use towers over live rail. Built the daily-log flow the way a super actually walks the deck.',
  },
  {
    key: 'about.team.elena.name',
    name: 'Elena Rostova, PE',
    roleKey: 'about.team.elena.role',
    roleDef: 'Structural Engineer of Record · Co-founder',
    bioKey: 'about.team.elena.bio',
    bioDef:
      'Licensed SE who has stamped supplements on long-span steel and post-tensioned slabs. Owns the RFI thread model — the question, the determination, and the record of what governed.',
  },
  {
    key: 'about.team.jamison.name',
    name: 'Jamison Brooks',
    roleKey: 'about.team.jamison.role',
    roleDef: 'Head of Field Systems',
    bioKey: 'about.team.jamison.bio',
    bioDef:
      'Ex-mechanical superintendent who kept half a trade fleet working through basement offline weeks. Designs the offline cache and trailer-sync behavior.',
  },
  {
    key: 'about.team.devina.name',
    name: 'Devina Patel',
    roleKey: 'about.team.devina.role',
    roleDef: 'Principal Systems Engineer',
    bioKey: 'about.team.devina.bio',
    bioDef:
      'Distributed-systems engineer obsessed with sub-second sheet rendering on five-year-old field tablets. Owns drawing velocity and sync fidelity.',
  },
] as const

/**
 * Public "About" page for the construction-management app — the design's
 * full story: who built it, why the seat tax is refused, the four
 * non-negotiables, the team, and the CTA. The capability grid stays.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('about.pageTitle', {}, { defaultValue: 'About' })
  }, [t])

  const h2 = cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight', 'wrap-anywhere')
  const h3 = cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))
  const body = cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'leading-relaxed')

  return (
    <ContentPageShell
      dataMolId="page-about"
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t(
        'about.heroTitle',
        {},
        { defaultValue: 'Built by jobsite supers. Hardened for the mud.' },
      )}
      subtitle={t(
        'about.pageSubtitle',
        { appName: APP_NAME },
        {
          defaultValue: `${APP_NAME} is construction project management for commercial jobsites — daily logs, punch lists, RFIs, and subcontractors in one place.`,
        },
      )}
      bare
      containerSize="lg"
    >
      <div className="space-y-14">
        {/* Why we refuse the seat tax — the origin story */}
        <section data-mol-id="about-seat-tax-story" className={cm.cn('space-y-4 max-w-3xl')}>
          <h2 className={h2}>
            {t(
              'about.seatTaxStory.title',
              {},
              { defaultValue: 'Why We Refuse the Software “Seat Tax” on Construction Trades' },
            )}
          </h2>
          <p className={body}>
            {t(
              'about.seatTaxStory.p1',
              {},
              {
                defaultValue:
                  'On a 54-story mixed-use job in Seattle, a mechanical subcontractor installed 140 feet of chilled-water pipe against an outdated architectural revision. The rework cost $84,000 and six days of schedule — because the general contractor would not buy one more per-seat license for the pipefitting foreman, so the firm built from whatever PDF was in the trailer that morning.',
              },
            )}
          </p>
          <p className={body}>
            {t(
              'about.seatTaxStory.p2',
              {},
              {
                defaultValue:
                  'Construction is an interdependent assembly line executed in the rain and the mud. Penalizing general contractors for inviting electricians, structural welders, and concrete finishers into the single source of truth is not bad software design — it is actively dangerous to the jobsite.',
              },
            )}
          </p>
        </section>

        {/* Four non-negotiables */}
        <section data-mol-id="about-non-negotiables" className="space-y-6">
          <h2 className={h2}>
            {t(
              'about.nonNegotiables.title',
              {},
              { defaultValue: 'Four Non-Negotiables for Our Software' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            {NON_NEGOTIABLES.map((n) => (
              <div key={n.key} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-2')}>
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'inline-flex items-center justify-center w-10 h-10 rounded-lg',
                    n.bg,
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {n.icon}
                  </span>
                </span>
                <h3 className={h3}>{t(n.key, {}, { defaultValue: n.def })}</h3>
                <p className={body}>{t(n.bodyKey, {}, { defaultValue: n.bodyDef })}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Capability pillars (e2e-asserted) */}
        <section data-mol-id="about-features" className="space-y-6">
          <h2 className={h2}>
            {t('about.features.title', {}, { defaultValue: 'What the field gets on day one' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            {FEATURES.map((f) => (
              <section
                key={f.titleKey}
                className={cm.cn(cm.card(), cm.sp('p', 6), 'flex gap-4 items-start')}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'material-symbols-outlined brand-gradient text-on-primary rounded-lg p-2',
                  )}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
                <div>
                  <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                  </p>
                </div>
              </section>
            ))}
          </div>
        </section>

        {/* Team */}
        <section data-mol-id="about-team" className="space-y-6">
          <h2 className={h2}>
            {t(
              'about.team.title',
              {},
              { defaultValue: 'Run by Construction Veterans & Systems Engineers' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            {TEAM.map((m) => (
              <div key={m.key} className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-1')}>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {t(m.key, {}, { defaultValue: m.name })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary uppercase tracking-wider',
                  )}
                >
                  {t(m.roleKey, {}, { defaultValue: m.roleDef })}
                </p>
                <p className={cm.cn(body, cm.sp('mt', 2))}>
                  {t(m.bioKey, {}, { defaultValue: m.bioDef })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Where it is built */}
        <section data-mol-id="about-where" className={cm.cn('space-y-3 max-w-3xl')}>
          <h2 className={h2}>
            {t('about.where.title', {}, { defaultValue: 'Engineered Where Heavy Iron Operates' })}
          </h2>
          <p className={body}>
            {t(
              'about.where.body',
              {},
              {
                defaultValue:
                  'The product is developed a floor above an active mock-up bay: formwork, rebar mats, and a walking crew test every build before it ships. If it does not survive a gloved hand, a dusty screen, and a dead zone under Level B2, it does not go out.',
              },
            )}
          </p>
        </section>

        {/* CTA */}
        <section
          data-mol-id="about-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl text-center brand-gradient text-on-primary space-y-3',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t(
              'about.cta.title',
              {},
              { defaultValue: 'Ready to Run Your Jobsite With Industrial Precision?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'max-w-2xl mx-auto')}>
            {t(
              'about.cta.body',
              {},
              {
                defaultValue:
                  'Create a free account, start a project, and file the first daily log before the next pour. Unlimited trade seats included.',
              },
            )}
          </p>
          <Link
            to="/signup"
            data-mol-id="about-cta-start"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 rounded-lg bg-surface text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            {t('about.cta.start', {}, { defaultValue: 'Start your first jobsite' })}
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
            >
              arrow_forward
            </span>
          </Link>
        </section>

        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('about.ctaLeadin', {}, { defaultValue: 'Ready to run your first job?' })}{' '}
          <Link className={'text-primary font-semibold hover:underline'} to="/signup">
            {t('about.ctaLink', {}, { defaultValue: 'Create a free account' })}
          </Link>
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
