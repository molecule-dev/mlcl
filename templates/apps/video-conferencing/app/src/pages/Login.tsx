import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state — surfaced via useLogin().error
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.grid({ cols: 1 }),
        'lg:grid-cols-2 bg-surface-container-lowest',
      )}
    >
      <AuthBrandPanel />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
        )}
      >
        <div className={cm.cn(cm.maxW('md'), 'w-full', cm.stack(8))}>
          <header className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('auth.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
            <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
              {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
            </h1>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t('auth.loginSubtitle', {}, { defaultValue: 'Sign in to your workspace' })}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.stack(4)}>
            <FormField
              label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormField
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className={cm.flex({ justify: 'end' })}>
              <Link
                to="/forgot-password"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-secondary hover:text-primary transition-colors',
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
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'w-full bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-60',
              )}
            >
              {isLoggingIn
                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </button>
            {error && (
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'rounded-lg bg-error/10 text-error border border-error/20',
                )}
              >
                {error.message}
              </div>
            )}
          </form>

          <OAuthButtons />

          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('auth.noAccount', {}, { defaultValue: "Don't have a workspace?" })}{' '}
            <Link
              to="/signup"
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-secondary hover:text-primary transition-colors',
              )}
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function FormField({ label, ...inputProps }: FormFieldProps) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(2)}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        {...inputProps}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('base'),
          'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50',
        )}
      />
    </label>
  )
}
