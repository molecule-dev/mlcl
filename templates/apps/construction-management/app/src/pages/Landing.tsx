import { useEffect } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const PILLARS = [
  {
    icon: 'edit_note',
    titleKey: 'landing.pillar.dailyLogs.title',
    titleDefault: 'Daily logs',
    bodyKey: 'landing.pillar.dailyLogs.body',
    bodyDefault:
      'Weather, crew count, hours, and work performed per area — the field record, filed in minutes.',
  },
  {
    icon: 'checklist',
    titleKey: 'landing.pillar.punch.title',
    titleDefault: 'Punch lists',
    bodyKey: 'landing.pillar.punch.body',
    bodyDefault:
      'File defects at plan locations, triage by severity, and close them out with photos.',
  },
  {
    icon: 'forum',
    titleKey: 'landing.pillar.rfis.title',
    titleDefault: 'RFIs',
    bodyKey: 'landing.pillar.rfis.body',
    bodyDefault:
      'Threaded questions and answers with drawing references — the final answer is the decision.',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${APP_NAME} — ${APP_TAGLINE}`
  }, [])

  return (
    <div className={cm.cn('min-h-screen bg-background text-on-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'max-w-6xl mx-auto',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined brand-gradient text-on-primary rounded-lg p-1.5',
            )}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            construction
          </span>
          <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('landing.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
        </div>
        <nav
          className={cm.flex({ align: 'center', gap: 'md' })}
          aria-label={t('landing.navLabel', {}, { defaultValue: 'Main menu' })}
        >
          <Link
            to="/login"
            data-mol-id="landing-login-link"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-md hover:bg-surface-container',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/signup"
            data-mol-id="landing-signup-link"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md brand-gradient text-on-primary',
            )}
          >
            {t('landing.getStarted', {}, { defaultValue: 'Get started free' })}
          </Link>
        </nav>
      </header>

      <main className={cm.cn('max-w-6xl mx-auto', cm.sp('px', 8))}>
        <section className={cm.cn(cm.sp('py', 20), cm.textCenter, 'max-w-3xl mx-auto')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary uppercase tracking-widest',
            )}
          >
            {t('landing.eyebrow', {}, { defaultValue: 'Construction project management' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textSize('5xl'),
              cm.fontWeight('bold'),
              'tracking-tight',
            )}
          >
            {t(
              'landing.headline',
              {},
              { defaultValue: 'Run the job from groundbreaking to closeout' },
            )}
          </h1>
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'landing.subheadline',
              {},
              {
                defaultValue:
                  'Daily logs, punch lists, RFIs, and subcontractors for commercial jobsites — in one place your whole crew can use.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.sp('mt', 8),
              cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
            )}
          >
            <Link
              to="/signup"
              data-mol-id="landing-cta-signup"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-lg brand-gradient text-on-primary',
              )}
            >
              {t('landing.ctaPrimary', {}, { defaultValue: 'Start your first project' })}
            </Link>
            <Link
              to="/pricing"
              data-mol-id="landing-cta-pricing"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                'rounded-lg border border-outline-variant hover:bg-surface-container',
              )}
            >
              {t('landing.ctaSecondary', {}, { defaultValue: 'See pricing' })}
            </Link>
          </div>
        </section>

        <section
          className={cm.cn(cm.sp('pb', 20), cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}
        >
          {PILLARS.map((p) => (
            <article key={p.titleKey} className={cm.cn(cm.card(), cm.sp('p', 6))}>
              <span
                aria-hidden="true"
                className={cm.cn(
                  'material-symbols-outlined bg-primary-container text-on-primary-container rounded-lg p-2',
                )}
              >
                {p.icon}
              </span>
              <h2 className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t(p.titleKey, {}, { defaultValue: p.titleDefault })}
              </h2>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(p.bodyKey, {}, { defaultValue: p.bodyDefault })}
              </p>
            </article>
          ))}
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
          cm.sp('py', 8),
          'border-t border-outline-variant text-on-surface-variant text-sm',
        )}
      >
        <span>
          {t(
            'footer.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}' },
          )}
        </span>
        <Link to="/terms" className={'hover:text-primary'}>
          {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        </Link>
        <Link to="/privacy" className={'hover:text-primary'}>
          {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        </Link>
      </footer>
    </div>
  )
}

export default Landing
