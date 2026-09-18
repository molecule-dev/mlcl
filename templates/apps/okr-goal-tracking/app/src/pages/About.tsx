import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

interface Feature {
  id: string
  key: string
  def: string
}

const FEATURES: Feature[] = [
  {
    id: 'objectives',
    key: 'about.featureObjectives',
    def: 'Cascade company-level OKRs into team and individual objectives, so everyone can see how their work ladders up to what matters.',
  },
  {
    id: 'key-results',
    key: 'about.featureKeyResults',
    def: 'Attach measurable key results with start, target, and current values — progress is calculated automatically as you log updates.',
  },
  {
    id: 'check-ins',
    key: 'about.featureCheckIns',
    def: 'Run a five-minute weekly check-in: score progress, log confidence, and surface blockers before they derail the quarter.',
  },
  {
    id: 'reviews',
    key: 'about.featureReviews',
    def: 'Close every period with roll-up scorecards and reflection prompts that make the next quarter sharper than the last.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue: 'Aspirational, accountable, measurable OKR tracking for teams that climb.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-intro" className={cm.cn(cm.stack(2))}>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue: `${APP_NAME} is OKR and goal-tracking software for teams that want every quarter to mean something. Set ambitious objectives, attach measurable key results, and turn the weekly check-in into a five-minute ritual that keeps the whole company climbing in the same direction.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `We believe goals should be aspirational, accountable, and measurable — not a spreadsheet updated the night before the review. ${APP_NAME} gives every team a clear path up the mountain, with the context to know why each objective matters and the cadence to course-correct before the quarter slips away.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(3))}>
            {FEATURES.map((f) => (
              <li
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}
              >
                <span
                  aria-hidden
                  className="material-symbols-outlined text-primary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.key, {}, { defaultValue: f.def })}
                </span>
              </li>
            ))}
          </ul>
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
                defaultValue: `Have a question, found a bug, or want a guided tour? Reach the team from your account — every message goes to a real human who works on ${APP_NAME}.`,
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
