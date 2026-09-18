import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { PublicFooter } from '../components/PublicFooter.js'
import { PublicTopNav } from '../components/PublicTopNav.js'

const FEATURES = [
  {
    key: 'ask',
    icon: 'mic',
    defaultTitle: 'Ask in plain English',
    defaultBody:
      'Type a question like “show top 10 customers by Q3 revenue” and get back a chart, a table, and the exact SQL that ran — no query language required.',
  },
  {
    key: 'charts',
    icon: 'auto_graph',
    defaultTitle: 'Charts that pick themselves',
    defaultBody:
      'Bar, line, scatter, heatmap — {{appName}} chooses the right encoding for each answer and tunes the axes so the result is readable the moment it lands.',
  },
  {
    key: 'insights',
    icon: 'auto_awesome',
    defaultTitle: 'Anomalies surfaced for you',
    defaultBody:
      'Drift, outliers, and correlations are detected automatically and pushed to your insight feed as cards — not buried at the bottom of a dashboard.',
  },
  {
    key: 'lineage',
    icon: 'account_tree',
    defaultTitle: 'Reproducible lineage and export',
    defaultBody:
      'Every chart traces back through each transform to the original uploaded row, and any result exports to CSV in one click. Always defensible, always shareable.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-background text-on-surface antialiased',
      )}
    >
      <PublicTopNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(
          cm.maxW('3xl'),
          cm.mxAuto,
          cm.w('full'),
          cm.sp('px', 6),
          cm.sp('py', 16),
          'flex-1',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.22em] text-primary',
          )}
        >
          {t('about.eyebrow', {}, { defaultValue: 'About' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 3),
            cm.sp('mb', 6),
            'font-headline tracking-tight',
          )}
        >
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>

        <div className={cm.cn(cm.stack(4))}>
          <p
            data-mol-id="about-intro"
            className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.intro',
              { app: APP_NAME, tagline: APP_TAGLINE },
              {
                defaultValue:
                  '{{app}} is an AI data analyst that turns raw data into answers. Upload a CSV or connect a warehouse, ask a question in plain English, and get the right chart, the supporting table, and the SQL that produced it — {{tagline}}.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'font-headline',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p
            data-mol-id="about-mission"
            className={cm.cn('text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Analytics should not require a backlog ticket and a week of waiting. {{app}} puts a capable analyst behind a text box so product, ops, and finance teams can answer their own questions in minutes — while keeping every result reproducible and auditable.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'font-headline',
            )}
          >
            {t('about.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.key} className={cm.cn(cm.flex({ align: 'start', gap: 3 }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    'shrink-0 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                </span>
                <div className={cm.cn(cm.stack(1))}>
                  <h3
                    className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(
                      `about.feature.${f.key}.body`,
                      { appName: APP_NAME },
                      { defaultValue: f.defaultBody },
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'font-headline',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p
            data-mol-id="about-contact"
            className={cm.cn('text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or a dataset that stumped the model? Reach the {{app}} team from the in-app help menu — every message goes to a real person who works on the product.',
              },
            )}
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
