import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { RushesAuthShell } from '../components/RushesAuthShell.js'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error is tracked in hook state via login's own error handling
    }
  }

  return (
    <RushesAuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Sign in to keep cutting.' })}
      footer={
        <>
          {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            className={
              'text-[var(--video-link)] hover:text-[var(--video-link-hover)] font-medium transition-colors'
            }
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="login-form">
        <div className={cm.stack(4)}>
          <div>
            <label
              htmlFor="email"
              className={cm.cn(
                cm.textSize('xs'),
                'block font-mono uppercase tracking-widest text-[var(--video-text-muted-alt)] mb-1.5',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder={t(
                'login.emailPlaceholder',
                {},
                { defaultValue: 'editor@rushes.studio' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:ring-1 focus:ring-[var(--video-cta-from)]/40 focus:outline-none transition-colors placeholder:text-[var(--video-text-dim)]',
              )}
            />
          </div>

          <div>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-1.5')}>
              <label
                htmlFor="password"
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-mono uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                )}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </label>
              <Link
                to="/forgot-password"
                className={
                  'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors'
                }
              >
                {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
              </Link>
            </div>
            <div className={cm.cn('relative')}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('pr', 10),
                  cm.textSize('sm'),
                  'rounded-lg bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:ring-1 focus:ring-[var(--video-cta-from)]/40 focus:outline-none transition-colors placeholder:text-[var(--video-text-dim)]',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={
                  'absolute inset-y-0 right-3 flex items-center text-[var(--video-text-muted-alt)] hover:text-[var(--video-text-primary)] transition-colors'
                }
                aria-label={t(
                  'login.togglePassword',
                  {},
                  { defaultValue: 'Toggle password visibility' },
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            data-mol-id="login-error"
            className={cm.cn(cm.textSize('xs'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          data-mol-id="login-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg text-white bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] hover:from-[var(--video-cta-from-hover)] hover:to-[var(--video-cta-to-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span>
            {isLoggingIn
              ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
              : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>

        <OAuthButtons />
      </form>
    </RushesAuthShell>
  )
}

export default Login
