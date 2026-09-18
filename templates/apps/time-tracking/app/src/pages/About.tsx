import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PublicPageFooter } from '../components/PublicPageFooter.js'
import { PublicTopNav } from '../components/PublicTopNav.js'

const FEATURES = [
  {
    key: 'timer',
    defaultTitle: 'One-click timer',
    defaultBody:
      'Start tracking on any project from any screen — keyboard shortcuts and a sticky timer bar mean you never lose a billable minute.',
  },
  {
    key: 'projects',
    defaultTitle: 'Projects with budgets',
    defaultBody:
      'Color-coded projects, hourly rates, and live budget burn-down that warn you the moment scope creep starts costing you.',
  },
  {
    key: 'reports',
    defaultTitle: 'Reports clients love',
    defaultBody:
      'Drill down by project, client, or tag, and export clean CSV in a single click to share numbers your client can actually skim.',
  },
  {
    key: 'invoices',
    defaultTitle: 'Invoices, automatically',
    defaultBody:
      'Roll tracked hours into Stripe-backed invoices, send them, and mark them paid without ever leaving the app.',
  },
  {
    key: 'clients',
    defaultTitle: 'Clients & billing in one place',
    defaultBody:
      'Keep every client’s rate, currency, and billing address together so each invoice goes out correct the first time.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-secondary text-foreground antialiased',
      )}
    >
      <PublicTopNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(
          cm.flex1,
          cm.mxAuto,
          cm.w('full'),
          'max-w-3xl',
          cm.sp('px', 6),
          cm.sp('py', 16),
        )}
      >
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mb', 6),
            'tracking-tight',
          )}
        >
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>

        <div className={cm.cn('prose', cm.stack(4), 'text-foreground-secondary')}>
          <p data-mol-id="about-intro" className={cm.cn(cm.textSize('lg'))}>
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is precise time tracking built for freelancers, consultants, and agencies. Start a timer in one click, map every minute to a project and client, watch budgets burn down in real time, and turn tracked hours into Stripe-backed invoices — all in one place.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'text-foreground',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe independent professionals should get paid for every minute they work. We remove the friction between doing the work and billing for it, so you spend less time on admin and more time on the work that actually pays.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'text-foreground',
            )}
          >
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(3), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key}>
                <span className={cm.cn(cm.fontWeight('semibold'), 'text-foreground')}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </span>
                {' — '}
                {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
              </li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'text-foreground',
            )}
          >
            {t('about.plansTitle', {}, { defaultValue: 'Plans that grow with you' })}
          </h2>
          <p data-mol-id="about-plans">
            {t(
              'about.plansBody',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is free for up to 3 projects. Upgrade to Pro or Team as your client list grows — for unlimited projects, advanced reporting, longer history, and CSV exports.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'text-foreground',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want a feature? We read every message — reach the team from your account settings and a real person will get back to you.',
              },
            )}
          </p>
        </div>
      </main>
      <PublicPageFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
