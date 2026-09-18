import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthSplitLayout } from '../components/AuthSplitLayout.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
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
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'login.failed',
              {},
              { defaultValue: 'Sign in failed. Check your email and password.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Sign in to keep every dollar on the job.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('bold'), cm.textPrimary, 'hover:underline')}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/20',
            )}
          >
            {error}
          </div>
        ) : null}

        <AuthField
          id="email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          icon="mail"
        >
          <input
            id="email"
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
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <AuthField
          id="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          icon="lock"
          trailingLabel={
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.textPrimary,
                'hover:underline',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          }
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          }
        >
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <label
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            'cursor-pointer text-on-surface-variant',
          )}
        >
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(e) => setKeepSignedIn(e.target.checked)}
            className={cm.cn('h-4 w-4 rounded border-outline text-primary focus:ring-primary/30')}
          />
          <span>{t('login.keepSignedIn', {}, { defaultValue: 'Keep me signed in' })}</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('base'),
            'rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md',
          )}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthSplitLayout>
  )
}

interface AuthFieldProps {
  id: string
  label: string
  icon: string
  children: ReactNode
  trailing?: ReactNode
  trailingLabel?: ReactNode
}

export function AuthField({ id, label, icon, children, trailing, trailingLabel }: AuthFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(2)}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 1))}>
        <label
          htmlFor={id}
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </label>
        {trailingLabel}
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface transition-all',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xl'),
            'material-symbols-outlined text-on-surface-variant shrink-0',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className={cm.cn('flex-1 min-w-0')}>{children}</div>
        {trailing}
      </div>
    </div>
  )
}
