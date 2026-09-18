import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

interface Feature {
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    icon: 'function',
    titleKey: 'about.feature.formulas.title',
    titleDefault: 'Formula-first grids',
    bodyKey: 'about.feature.formulas.body',
    bodyDefault:
      'A spreadsheet engine with named ranges, structured references, and 350+ functions — recalculated instantly so a million-row workbook still feels effortless.',
  },
  {
    icon: 'view_kanban',
    titleKey: 'about.feature.views.title',
    titleDefault: 'Many views, one source of truth',
    bodyKey: 'about.feature.views.body',
    bodyDefault:
      'Grid, form, kanban, gallery, and calendar views over the same data, with rich column types — text, select, currency, percent, date, formula, and linked records.',
  },
  {
    icon: 'group',
    titleKey: 'about.feature.collab.title',
    titleDefault: 'Real-time collaboration',
    bodyKey: 'about.feature.collab.body',
    bodyDefault:
      'Live cursors, presence, cell-level comments, and full version history so your whole team can build on the same workbook without stepping on each other.',
  },
  {
    icon: 'sync_alt',
    titleKey: 'about.feature.io.title',
    titleDefault: 'Import, export, and automate',
    bodyKey: 'about.feature.io.body',
    bodyDefault:
      'CSV import and export, reusable templates, charts, and no-code automations connect {{name}} to the rest of your stack without glue code.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-surface-container-low text-on-surface antialiased')}
    >
      <PublicNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}
      >
        <p
          className={cm.cn(
            cm.sp('mb', 4),
            'text-[11px] font-bold uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('about.eyebrow', {}, { defaultValue: 'About' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'tracking-tight',
          )}
        >
          {t('about.pageTitle', { name: APP_NAME }, { defaultValue: 'About {{name}}' })}
        </h1>

        <div className={cm.cn(cm.stack(4), cm.textSize('lg'), 'text-on-surface-variant')}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { name: APP_NAME },
              {
                defaultValue:
                  '{{name}} is an Airtable-like spreadsheet for people who think in data. Build structured workbooks with rich column types, write formulas that read like English, switch between grid and kanban views, and collaborate with your team in real time — all in one place.',
              },
            )}
          </p>
        </div>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 12),
            cm.sp('mb', 3),
            'tracking-tight text-on-surface',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p
          data-mol-id="about-mission"
          className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.missionBody',
            { name: APP_NAME },
            {
              defaultValue:
                'Spreadsheets quietly run the world, but the tools have not kept up. {{name}} brings the speed of a real database, the clarity of multiple views, and the safety of version history to the humble grid — so structuring your thinking never means fighting your tools.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 12),
            cm.sp('mb', 6),
            'tracking-tight text-on-surface',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
          {FEATURES.map((feat) => (
            <li
              key={feat.icon}
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl border-t-4 border-primary shadow-sm',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(11),
                  cm.h(11),
                  cm.sp('mb', 4),
                  'rounded-lg bg-primary-fixed text-primary',
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">{feat.icon}</span>
              </span>
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'tracking-tight text-on-surface',
                )}
              >
                {t(feat.titleKey, {}, { defaultValue: feat.titleDefault })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
                {t(feat.bodyKey, { name: APP_NAME }, { defaultValue: feat.bodyDefault })}
              </p>
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 12),
            cm.sp('mb', 3),
            'tracking-tight text-on-surface',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p
          data-mol-id="about-contact"
          className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.contactBody',
            { name: APP_NAME },
            {
              defaultValue:
                'Have feedback, found a bug, or want a feature in {{name}}? We read every message — reach out any time and a real person on the team will get back to you.',
            },
          )}
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
