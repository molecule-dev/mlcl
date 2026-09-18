import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AulaAuthShell } from '../components/AulaAuthShell.js'
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
      // error is tracked in the hook's error state — no local handling needed
    }
  }

  return (
    <AulaAuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      title={t('login.title', {}, { defaultValue: 'Sign in to your classroom' })}
      subtitle={t(
        'login.subtitle',
        {},
        { defaultValue: 'Pick up the lecture, the lab, or the cohort exactly where you left off.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center')}>
          {t('login.footerPrompt', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        )}
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@school.edu' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <div className={cm.cn('relative')}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('pr', 12),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <label className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('sm'))}>
            <input
              type="checkbox"
              className={cm.cn(
                'h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/30',
              )}
            />
            <span className={cm.cn('text-on-surface-variant')}>
              {t('login.rememberMe', {}, { defaultValue: 'Keep me signed in' })}
            </span>
          </label>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.fontWeight('bold'),
            cm.sp('py', 3),
            cm.sp('px', 5),
            'w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60',
          )}
          data-mol-id="btn-sign-in"
        >
          <span>
            {isLoggingIn
              ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
              : t(
                  'login.signIn',
                  { appName: APP_NAME },
                  { defaultValue: 'Sign in to {{appName}}' },
                )}
          </span>
          {!isLoggingIn && (
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
          )}
        </button>
        <OAuthButtons />
      </form>
    </AulaAuthShell>
  )
}

export default Login
