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
    id: 'roster',
    titleKey: 'about.feature.roster.title',
    titleDefault: 'Weekly rosters',
    bodyKey: 'about.feature.roster.body',
    bodyDefault:
      'A staff-by-day grid for the whole week — shift blocks with role and time range, week navigation, and draft-versus-published state so the roster is built before the team ever sees it.',
  },
  {
    id: 'swaps',
    titleKey: 'about.feature.swaps.title',
    titleDefault: 'Swap & drop approvals',
    bodyKey: 'about.feature.swaps.body',
    bodyDefault:
      'Staff offer a shift to a teammate or ask to drop it entirely; a manager approves in one click and the assignment moves atomically — no double-booking, ever.',
  },
  {
    id: 'open',
    titleKey: 'about.feature.open.title',
    titleDefault: 'Open-shift claiming',
    bodyKey: 'about.feature.open.body',
    bodyDefault:
      'Unassigned published shifts become a marketplace the team can claim. First qualified claim a manager approves wins the slot; everyone else is declined automatically.',
  },
  {
    id: 'availability',
    titleKey: 'about.feature.availability.title',
    titleDefault: 'Availability & black-outs',
    bodyKey: 'about.feature.availability.body',
    bodyDefault:
      'Recurring weekly windows plus date black-outs per person. Scheduling outside them is allowed but flagged, so managers see the soft conflict before the week publishes.',
  },
  {
    id: 'staff',
    titleKey: 'about.feature.staff.title',
    titleDefault: 'The roster of people',
    bodyKey: 'about.feature.staff.body',
    bodyDefault:
      'Roles, contact details, and max weekly hours per person — the constraints the scheduler respects while coverage and overtime stay visible.',
  },
  {
    id: 'timesheets',
    titleKey: 'about.feature.timesheets.title',
    titleDefault: 'Timesheets & export',
    bodyKey: 'about.feature.timesheets.body',
    bodyDefault:
      'Completed shifts roll up per person per week — scheduled versus claimed — with one-click CSV export for payroll. No spreadsheet gymnastics.',
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
                '{{app}} is a shift-scheduling workspace for hourly teams. Weekly rosters, availability, swap approvals, open shifts, and timesheets live in one source of truth — no enterprise gloss, just the coverage your team needs on the floor.',
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
                  'Managers of hourly teams spend hours texting, spreadsheeting, and re-texting to fill a week. We build the boring-but-essential scheduling foundation — rosters, availability, swaps, and claims — so managers spend their energy on the floor, not the phone.',
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
