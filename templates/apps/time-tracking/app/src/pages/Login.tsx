import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const { status, error, login } = useLogin()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before each modal opens.
  // The standalone /privacy and /terms routes still exist for deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  const legalLinkClass = cm.cn(cm.fontWeight('semibold'), 'text-blue-600 hover:underline')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error state is tracked inside the login hook
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex({}), 'bg-surface-secondary antialiased')}>
      {/* Brand panel — decorated gradient with sample timer card */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 12),
          'hidden lg:flex w-[42%] relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-emerald-700 text-white',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-xl bg-surface/20 backdrop-blur-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
          </span>
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>

        <div className={cm.cn('relative z-10', cm.stack(8))}>
          <div className={cm.stack(4)}>
            <p
              className={cm.cn('text-[11px] font-bold uppercase tracking-widest text-blue-100/80')}
            >
              {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
            </p>
            <h1
              className={cm.cn('text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.05]')}
            >
              {t('login.brand.headline', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-blue-50/90 max-w-md leading-relaxed')}>
              {t(
                'login.brand.subtitle',
                {},
                {
                  defaultValue:
                    'Pick up the timer where you left off — every minute already mapped to a project, a client, an invoice.',
                },
              )}
            </p>
          </div>

          {/* Sample tracked-today card */}
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface/10 backdrop-blur-md rounded-2xl border border-surface/10 max-w-sm',
            )}
          >
            <p
              className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-blue-100/70')}
            >
              {t('login.brand.sampleLabel', {}, { defaultValue: 'Today so far' })}
            </p>
            <p
              className={cm.cn(
                'text-4xl font-extrabold tracking-tighter font-mono tabular-nums mt-1',
              )}
            >
              04:18:32
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 3))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'px-2 h-5 rounded-full bg-emerald-400/30 text-emerald-100 text-[10px] font-black uppercase tracking-widest',
                )}
              >
                <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
                  play_arrow
                </span>
                {t('login.brand.tracking', {}, { defaultValue: 'Tracking' })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-blue-100/80')}>
                Acme · Q4 Rebrand
              </span>
            </div>
          </div>
        </div>

        <p className={cm.cn(cm.textSize('xs'), 'relative z-10 text-blue-100/60')}>
          {t(
            'login.brand.legal',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. Every second, accounted for.' },
          )}
        </p>

        <div
          className={cm.cn(
            'absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'absolute -left-20 top-32 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
        />
      </aside>

      {/* Form pane */}
      <main
        className={cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(8))}>
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'lg:hidden')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 text-white',
              )}
            >
              <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                schedule
              </span>
            </span>
            <span className={cm.cn(cm.textSize('lg'), 'font-extrabold text-foreground')}>
              {APP_NAME}
            </span>
          </Link>

          <div className={cm.stack(2)}>
            <h2 className={cm.cn('text-3xl font-extrabold tracking-tight text-foreground')}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
              {t('login.subheading', {}, { defaultValue: 'Pick up the timer where you left off.' })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cm.stack(4)} data-test="login-form">
            <AuthField
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              icon="mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              data-test="login-email"
            />
            <AuthField
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              icon="lock"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              data-test="login-password"
            />
            <div className={cm.cn(cm.flex({ justify: 'end' }))}>
              <Link
                to="/forgot-password"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-blue-600 hover:underline',
                )}
              >
                {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
              </Link>
            </div>
            {error && (
              <p
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('xs'),
                  'rounded-lg bg-rose-50 text-error border border-rose-200',
                )}
              >
                {error.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              data-test="login-submit"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all',
              )}
            >
              {isLoggingIn
                ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              {!isLoggingIn && (
                <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <OAuthButtons />

          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-foreground-secondary')}>
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
            <Link
              to="/signup"
              className={cm.cn(cm.fontWeight('bold'), 'text-blue-600 hover:underline')}
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </p>

          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-center leading-relaxed text-foreground-secondary',
            )}
          >
            {t(
              'auth.legalConsent.prefix',
              { appName: APP_NAME },
              { defaultValue: 'By continuing, you agree to {{appName}}’s' },
            )}{' '}
            <button type="button" onClick={openTerms} className={legalLinkClass}>
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button type="button" onClick={openPrivacy} className={legalLinkClass}>
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </button>
            {'.'}
          </p>
          {modals}
        </div>
      </main>
    </div>
  )
}

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: string
}

export function AuthField({ label, icon, ...rest }: AuthFieldProps) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(1)}>
      <span
        className={cm.cn(
          'text-[10px] font-bold uppercase tracking-widest text-foreground-secondary',
        )}
      >
        {label}
      </span>
      <span className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
        <span
          className={cm.cn('material-symbols-outlined absolute left-3 text-foreground-tertiary')}
        >
          {icon}
        </span>
        <input
          {...rest}
          className={cm.cn(
            cm.w('full'),
            cm.sp('pl', 10),
            cm.sp('pr', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all',
          )}
        />
      </span>
    </label>
  )
}

export default Login
export { Login as LoginPage }
