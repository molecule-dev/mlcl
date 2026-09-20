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

/**
 * Public "About" page for the construction-management app.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('footer.about', {}, { defaultValue: 'About' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <ContentPageShell
      dataMolId="page-about"
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', {}, { defaultValue: `Built for the jobsite` })}
      subtitle={t(
        'about.pageSubtitle',
        { appName: APP_NAME },
        {
          defaultValue: `${APP_NAME} is construction project management for commercial jobsites — daily logs, punch lists, RFIs, and subcontractors in one place.`,
        },
      )}
      bare
    >
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
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
              <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
              </p>
            </div>
          </section>
        ))}
      </div>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 8), 'text-on-surface-variant')}>
        {t('about.ctaLeadin', {}, { defaultValue: 'Ready to run your first job?' })}{' '}
        <Link className={'text-primary font-semibold hover:underline'} to="/signup">
          {t('about.ctaLink', {}, { defaultValue: 'Create a free account' })}
        </Link>
      </p>
    </ContentPageShell>
  )
}

export default About
