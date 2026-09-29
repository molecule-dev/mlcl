import { useEffect } from 'react'
import { Navigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AuthFooter from '../components/AuthFooter.js'
import LoginCard from '../components/LoginCard.js'

/**
 * Sign-in page. The card is the product; the aside is the design's
 * "jobsite terminal" context panel — the live-project showcase (sample
 * jobsite stats, the same demo jobsite the landing page features) that
 * shows the field what they are signing into.
 *
 * @returns The rendered login page.
 */
function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const pageTitle = t('login.pageTitle', {}, { defaultValue: 'Sign In' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const siteStats = [
    {
      icon: 'wb_sunny',
      key: 'login.site.weather',
      def: 'Site weather',
      valueKey: 'login.site.weatherValue',
      valueDef: '68°F / Clear',
    },
    {
      icon: 'groups',
      key: 'login.site.headcount',
      def: 'Headcount',
      valueKey: 'login.site.headcountValue',
      valueDef: '46 on the deck',
    },
    {
      icon: 'foundation',
      key: 'login.site.pour',
      def: 'Pour status',
      valueKey: 'login.site.pourValue',
      valueDef: 'P4 slab — pour active',
    },
    {
      icon: 'schedule',
      key: 'login.site.shift',
      def: 'Shift',
      valueKey: 'login.site.shiftValue',
      valueDef: 'Shift 02 · 15:00–23:00',
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
            <LoginCard />
          </div>

          {/* Jobsite terminal context panel (sample showcase data) */}
          <aside
            data-mol-id="login-jobsite-panel"
            aria-label={t(
              'login.site.panelLabel',
              {},
              { defaultValue: 'Example jobsite terminal preview' },
            )}
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-inverse-surface text-inverse-on-surface space-y-5 max-w-[540px] w-full mx-auto',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-on-primary shrink-0"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  login
                </span>
              </span>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
                {t('login.site.heading', {}, { defaultValue: 'Sign in to Jobsite Terminal' })}
              </h2>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-inverse-on-surface')}>
              {t(
                'login.site.sub',
                {},
                {
                  defaultValue:
                    'Access active projects, hyperlinked drawings, daily crew logs, and field-to-office sync from the trailer or the slab deck.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                'rounded-xl bg-surface-container-lowest text-on-surface',
                cm.sp('p', 5),
                'space-y-3',
              )}
            >
              <div>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t(
                    'login.site.project',
                    {},
                    { defaultValue: '740 Pacific Tower — Phase 2 Substructure' },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'login.site.projectMeta',
                    {},
                    {
                      defaultValue:
                        'PROJECT ID: #SFO-2024-884 · GENERAL CONTRACTOR: APEX BUILT INC.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.grid({ cols: 2, gap: 'md' }),
                  'pt-2 border-t border-outline-variant',
                )}
              >
                {siteStats.map((s) => (
                  <div key={s.key} className={cm.flex({ gap: 'sm', align: 'center' })}>
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary-container text-on-primary-container shrink-0"
                    >
                      <span className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}>
                        {s.icon}
                      </span>
                    </span>
                    <div className="min-w-0">
                      {/* Plain label/value pairs — a <dl> here nested the terms
                          one level too deep for the axe definition-list rule. */}
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(s.key, {}, { defaultValue: s.def })}
                      </p>
                      <p
                        className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'truncate')}
                      >
                        {t(s.valueKey, {}, { defaultValue: s.valueDef })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant pt-1 border-t border-outline-variant',
                )}
              >
                {t(
                  'login.site.sampleNote',
                  {},
                  { defaultValue: 'Sample jobsite — sign in to see your own projects.' },
                )}
              </p>
            </div>
          </aside>
        </div>
      </main>
      <AuthFooter />
    </div>
  )
}

export default Login
export { Login, Login as LoginPage }
