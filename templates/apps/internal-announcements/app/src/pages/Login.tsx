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
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/feed'
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
      /* error tracked in hook */
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t(
        'login.heading',
        { appName: APP_NAME },
        { defaultValue: 'Sign in to {{appName}}' },
      )}
      description={t(
        'login.description',
        {},
        { defaultValue: 'Pick up the announcements waiting for your attention.' },
      )}
      footer={
        <span>
          {t('login.noAccount', {}, { defaultValue: 'New here?' })}{' '}
          <Link to="/signup" className={cm.cn('font-semibold text-primary hover:underline')}>
            {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@northwindlabs.com' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
            <Link
              to="/forgot-password"
              className={cm.cn('text-primary hover:underline normal-case tracking-normal text-xs')}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder={t('login.passwordPlaceholder', {}, { defaultValue: 'Your password' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
          />
        </label>

        {error && (
          <div
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('p', 3),
              'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
            )}
            role="alert"
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'rounded-full bg-primary text-on-primary disabled:opacity-60 hover:bg-primary-active transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>login</span>
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.submit', {}, { defaultValue: 'Sign in to your workspace' })}
        </button>
      </form>

      <div className={cm.cn(cm.sp('mt', 2))}>
        <OAuthButtons />
      </div>
    </AuthShell>
  )
}

export default Login
