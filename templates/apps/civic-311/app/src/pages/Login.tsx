// Login page — split municipal resident portal (Stitch design
// design-civic-311-login): the civic-transparency promo column (banner,
// account benefits, operations ticker) beside the sign-in card.
import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LoginCard from '../components/LoginCard.js'
import LoginFooter from '../components/LoginFooter.js'
import LoginLogo from '../components/LoginLogo.js'

/** Resident account benefit bullet. */
const BENEFITS: Array<{ id: string; icon: string; title: string; body: string }> = [
  {
    id: 'sms',
    icon: 'sms',
    title: 'Real-Time SMS Dispatch Alerts',
    body: 'Receive verified technician status changes when DPW crews arrive on your street.',
  },
  {
    id: 'ward',
    icon: 'map',
    title: 'Ward-Level Council Notices',
    body: 'Automated advisory alerts for road resurfacing, tree limb pickup, and utility shutdowns in your district.',
  },
  {
    id: 'priority',
    icon: 'fact_check',
    title: 'Priority Scheduling & Photo Logs',
    body: 'Direct upload verification to provide municipal inspectors before-and-after work confirmation.',
  },
]

function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t(
      'login.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Sign in — {{appName}}' },
    )
  }, [t])
  return (
    <div
      className={cm.cn(
        'bg-background selection:bg-primary-fixed selection:text-on-primary-fixed',
        cm.minH('screen'),
      )}
    >
      <main
        className={cm.cn(
          cm.mxAuto,
          cm.w('full'),
          cm.maxW('6xl'),
          cm.sp('px', 6),
          cm.sp('py', 10),
          cm.flex({ direction: 'col', justify: 'center', gap: 'lg' }),
        )}
      >
        <LoginLogo />
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Right column first on mobile (the card), per the design order */}
          <section className={cm.cn('order-1 lg:order-2 lg:col-span-7')}>
            <LoginCard />
          </section>

          {/* Civic transparency promo column (design: left 5 cols) */}
          <section className={cm.cn(cm.stack(6), 'order-2 lg:order-1 lg:col-span-5')}>
            {/* Rich municipal header banner */}
            <div className="relative overflow-hidden rounded-xl bg-civic-gradient p-7 text-white shadow-sm">
              <span
                className="material-symbols-outlined pointer-events-none absolute -bottom-10 -right-8 text-[160px] text-white/10"
                aria-hidden
              >
                verified_user
              </span>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.sp('mb', 4),
                  cm.textSize('xs'),
                  'inline-flex rounded-full border border-white/20 bg-white/15',
                )}
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden>
                  policy
                </span>
                {t('login.portalBadge', {}, { defaultValue: 'City of Riverton Citizen Portal' })}
              </div>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  'leading-tight',
                )}
              >
                {t(
                  'login.heroTitle',
                  {},
                  { defaultValue: 'Civic Transparency & Resident Services Access' },
                )}
              </h1>
              <p className="text-sm leading-relaxed text-white/85">
                {t(
                  'login.heroBody',
                  {},
                  {
                    defaultValue:
                      'Directly connect with the Department of Public Works, Code Enforcement, and City Council. Track repairs in real time with high-integrity municipal logs.',
                  },
                )}
              </p>
            </div>

            {/* Verified account advantages */}
            <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  'border-b border-surface-container pb-3',
                )}
              >
                <span className="material-symbols-outlined text-primary" aria-hidden>
                  verified
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
                  )}
                >
                  {t(
                    'login.benefitsTitle',
                    {},
                    { defaultValue: 'Riverton Resident Account Benefits' },
                  )}
                </h2>
              </div>
              <ul className={cm.stack(4)}>
                {BENEFITS.map((benefit) => (
                  <li
                    key={benefit.id}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 3 }),
                      'text-sm text-on-surface-variant',
                    )}
                  >
                    <span
                      className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-primary"
                      aria-hidden
                    >
                      {benefit.icon}
                    </span>
                    <div>
                      <strong className={cm.fontWeight('medium') + ' block text-on-surface'}>
                        {t(
                          `login.benefit.${benefit.id}.title`,
                          {},
                          { defaultValue: benefit.title },
                        )}
                      </strong>
                      {t(`login.benefit.${benefit.id}.body`, {}, { defaultValue: benefit.body })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Live status ticker */}
            <div
              data-mol-id="login-ops-ticker"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 4 }),
                'rounded-xl border border-outline-variant/40 bg-surface-container-low p-4',
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 3 })}>
                <div className="rounded-lg bg-surface-container-highest p-2 text-primary">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>
                    query_stats
                  </span>
                </div>
                <div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('login.opsLabel', {}, { defaultValue: 'City Operations Health' })}
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 2, wrap: 'wrap' }),
                      cm.sp('mt', 1),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    <span>
                      {t('login.opsSla', {}, { defaultValue: 'Response SLA:' })}{' '}
                      <span className="font-mono font-bold text-primary">96.4%</span>
                    </span>
                    <span className="text-outline-variant">•</span>
                    <span>
                      {t('login.opsCrews', {}, { defaultValue: 'DPW Crews:' })}{' '}
                      <span className="font-mono font-bold">28</span>
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-primary',
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                {t('login.opsLive', {}, { defaultValue: 'Open Data Live' })}
              </span>
            </div>

            {/* Charter compliance note */}
            <div
              className={cm.cn(
                cm.flex({ align: 'start', gap: 3 }),
                cm.sp('px', 2),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <span
                className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-outline"
                aria-hidden
              >
                shield
              </span>
              <p>
                {t(
                  'login.charterNote',
                  {},
                  {
                    defaultValue:
                      'Governed under Riverton Municipal Charter § 4-112 (Public Accessibility & Record Integrity). Submissions are subject to Riverton Open Records & Sunshine Compliance guidelines.',
                  },
                )}
              </p>
            </div>
          </section>
        </div>
        <LoginFooter />
      </main>
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
