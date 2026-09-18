import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/c'
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
  const [twoFactorToken, setTwoFactorToken] = useState('')

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // The user resource's log-in handler accepts an optional
      // `twoFactorToken` alongside the credentials — required once the
      // user enables two-factor auth in Settings → Authentication.
      const credentials: { email: string; password: string; twoFactorToken?: string } = {
        email,
        password,
      }
      const token = twoFactorToken.trim()
      if (token) credentials.twoFactorToken = token
      await login(credentials)
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t(
        'login.heading',
        { appName: APP_NAME },
        { defaultValue: 'Sign back into {{appName}}.' },
      )}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Pick up where you left off — your unread threads are waiting.' },
      )}
      footer={
        <>
          {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <div className={cm.stack(2)}>
          <label
            htmlFor="login-email"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@stoa.community' })}
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <label
              htmlFor="login-password"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="login-2fa"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('login.twoFactor', {}, { defaultValue: 'Two-factor token (optional)' })}
          </label>
          <input
            id="login-2fa"
            type="text"
            inputMode="numeric"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value)}
            autoComplete="one-time-code"
            placeholder="123 456"
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base tracking-[0.3em]',
            )}
          />
        </div>
        {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error.message}</p>}
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'inline-flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 disabled:opacity-60',
          )}
        >
          {isLoggingIn ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined text-base animate-spin')}
                aria-hidden
              >
                progress_activity
              </span>
              {t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })}
            </>
          ) : (
            <>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-on-surface-variant')}>
        <span className={cm.cn('h-px flex-1 bg-outline-variant/40')} />
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-widest')}
        >
          {t('login.orContinueWith', {}, { defaultValue: 'or continue with' })}
        </span>
        <span className={cm.cn('h-px flex-1 bg-outline-variant/40')} />
      </div>
      <OAuthButtons />
    </AuthShell>
  )
}

export default Login
