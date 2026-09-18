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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      /* tracked in hook */
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t('login.heading', {}, { defaultValue: 'Sign in to keep learning.' })}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Pick up where you left off — your sessions, messages and tutors are waiting.',
        },
      )}
      footerLeft={t('login.support', {}, { defaultValue: 'Need help?' })}
      footerRight={
        <Link
          to="/signup"
          className={cm.cn(
            cm.fontWeight('semibold'),
            'text-primary hover:underline decoration-2 underline-offset-4',
          )}
        >
          {t('login.signup', {}, { defaultValue: 'Create an account →' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        <Field label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}>
          <span className={cm.cn('relative block')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
            >
              mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
              )}
              placeholder={`you@${APP_NAME.toLowerCase()}.app`}
            />
          </span>
        </Field>
        <Field
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          right={
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          }
        >
          <span className={cm.cn('relative block')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'pl-11 pr-12 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
              )}
              placeholder="••••••••"
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
                'absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1',
              )}
            >
              <span className={cm.cn('material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </span>
        </Field>

        {error && (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'rounded-xl py-3.5 text-on-primary shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 100%)',
          }}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.signIn', { appName: APP_NAME }, { defaultValue: 'Sign in to {{appName}}' })}
          {!isLoggingIn && (
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              arrow_forward
            </span>
          )}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

function Field({
  label,
  right,
  children,
}: {
  label: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(2)}>
      <span className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
        {right}
      </span>
      {children}
    </label>
  )
}
