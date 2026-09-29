import { useEffect } from 'react'
import { Navigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AuthFooter from '../components/AuthFooter.js'
import SignupCard from '../components/SignupCard.js'

function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const pageTitle = t('signup.pageTitle', {}, { defaultValue: 'Create Account' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const setupPoints = [
    {
      icon: 'bolt',
      key: 'signup.fieldSetup.title',
      def: '5-minute trailer setup',
      bodyKey: 'signup.fieldSetup.body',
      bodyDef:
        'Set up your trailer workstation or tablet fleet and file the first log the same shift.',
    },
    {
      icon: 'group_add',
      key: 'signup.fieldSetup.seats.title',
      def: 'Free trade subcontractor seats',
      bodyKey: 'signup.fieldSetup.seats.body',
      bodyDef:
        'Invite every sub, inspector, and architect on the job — no credit card, no seat fees.',
    },
    {
      icon: 'sync',
      key: 'signup.fieldSetup.sync.title',
      def: 'Field-to-office sync',
      bodyKey: 'signup.fieldSetup.sync.body',
      bodyDef:
        'Work offline through the pour; the record reconciles when the tablet re-enters Wi-Fi.',
    },
  ]

  return (
    <div
      aria-label={pageTitle}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        cm.sp('p', 6),
        cm.sp('py', 16),
        'bg-background text-on-background selection:bg-primary-fixed selection:text-primary',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.flex1,
          cm.w('full'),
          cm.maxW('full'),
        )}
      >
        <div
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'xl' }),
            'lg:grid-cols-2 w-full max-w-5xl items-center',
          )}
        >
          <div className={cm.flex({ direction: 'col', align: 'center' })}>
            <SignupCard />
          </div>

          {/* Deployment lead-in panel */}
          <aside
            data-mol-id="signup-deploy-panel"
            aria-label={t('signup.deploy.panelLabel', {}, { defaultValue: 'Getting started' })}
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-primary-container text-on-primary-container space-y-5 max-w-[540px] w-full mx-auto',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg brand-gradient text-on-primary shrink-0"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </span>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest',
                )}
              >
                {t(
                  'signup.deploy.eyebrow',
                  {},
                  { defaultValue: 'Get started · 14-day full field access' },
                )}
              </p>
            </div>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t(
                'signup.deploy.heading',
                {},
                { defaultValue: 'Deploy Groundwork on your next pour or project' },
              )}
            </h2>
            <ul className="space-y-4">
              {setupPoints.map((p) => (
                <li key={p.key} className={cm.flex({ gap: 'sm', align: 'start' })}>
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface text-on-surface shrink-0"
                  >
                    <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
                      {p.icon}
                    </span>
                  </span>
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t(p.key, {}, { defaultValue: p.def })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>
                      {t(p.bodyKey, {}, { defaultValue: p.bodyDef })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
      <AuthFooter />
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
