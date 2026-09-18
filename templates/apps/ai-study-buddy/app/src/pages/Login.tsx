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
  const [showPassword, setShowPassword] = useState(false)

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      /* error tracked in hook state */
    }
  }

  return (
    <AuthShell dataMolId="page-login">
      <AuthBrandHeader />

      <div
        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }), cm.sp('mt', 2))}
      >
        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-center text-on-surface')}
        >
          {t('login.heading', {}, { defaultValue: 'Welcome back, learner' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'serif-text italic text-center text-on-surface-variant',
          )}
        >
          {t('login.subheading', {}, { defaultValue: 'Keep your streak going.' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {/* Email */}
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <label
            htmlFor="email"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative rounded-t-lg bg-surface-container-low border-b-2 border-transparent focus-within:border-primary py-3.5 transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              id="email"
              data-mol-id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'border-none bg-transparent p-0 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
              )}
            />
          </div>
        </div>

        {/* Password */}
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 1))}>
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
              data-mol-id="login-forgot-link"
              className={cm.cn(cm.textSize('xs'), 'font-bold text-primary hover:underline')}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative rounded-t-lg bg-surface-container-low border-b-2 border-transparent focus-within:border-primary py-3.5 transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              data-mol-id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'border-none bg-transparent p-0 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
              )}
            />
            <button
              type="button"
              data-mol-id="login-toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <div
            data-mol-id="login-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          data-mol-id="login-submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            cm.textSize('base'),
            cm.sp('mt', 2),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-60 transition-opacity active:scale-95',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          {isLoggingIn ? null : (
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              arrow_forward
            </span>
          )}
        </button>
      </form>

      <OAuthButtons />

      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.textCenter,
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        {t('login.noAccount', {}, { defaultValue: 'New here?' })}{' '}
        <Link
          to="/signup"
          data-mol-id="login-signup-link"
          className={'font-bold text-primary hover:underline'}
        >
          {t('login.signUp', {}, { defaultValue: "Create an account — it's free" })}
        </Link>
      </p>
    </AuthShell>
  )
}
