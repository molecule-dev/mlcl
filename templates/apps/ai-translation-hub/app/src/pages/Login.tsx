import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/dashboard'
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

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state (loginError is surfaced in the UI)
    }
  }

  return (
    <AuthShell>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 10),
          'rounded-[1.5rem] bg-surface-container-lowest border border-surface-container/50 shadow-2xl shadow-primary/10',
        )}
      >
        <AuthBrandHeader />
        <div className={cm.cn(cm.textCenter)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'tracking-tight')}>
            {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('login.subtitle', {}, { defaultValue: 'Sign in to continue translating.' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <label
              htmlFor="email"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@workspace.com' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 0),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'h-12 bg-transparent border-0 border-b-2 border-surface-dim focus:border-primary focus:ring-0 focus:outline-none text-base placeholder:text-outline-variant transition-colors duration-300',
              )}
            />
          </div>

          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <label
                htmlFor="password"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </label>
              <Link
                to="/forgot-password"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-primary hover:text-primary-container transition-colors',
                )}
              >
                {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 0),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'h-12 bg-transparent border-0 border-b-2 border-surface-dim focus:border-primary focus:ring-0 focus:outline-none text-base placeholder:text-outline-variant transition-colors duration-300',
              )}
            />
          </div>

          {error && (
            <div
              role="alert"
              data-mol-id="login-error"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                cm.textCenter,
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'w-full rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-all shadow-md shadow-primary/30 disabled:opacity-60',
            )}
          >
            {isLoggingIn
              ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
              : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </button>
        </form>

        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <span className={cm.cn('flex-1 h-px bg-surface-container-high')} />
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('common.or', {}, { defaultValue: 'or' })}
          </span>
          <span className={cm.cn('flex-1 h-px bg-surface-container-high')} />
        </div>

        <OAuthButtons />

        <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('login.noAccount', {}, { defaultValue: 'Don\u2019t have an account?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('bold'), cm.sp('ml', 1), 'text-primary hover:underline')}
          >
            {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default Login
export { Login as LoginPage }
