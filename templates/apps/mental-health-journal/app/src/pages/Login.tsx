import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthInput } from '../components/AuthInput.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/home'
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
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t('login.heading', {}, { defaultValue: 'Sign in to your journal' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'A gentle space for daily reflection.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
          <Link to="/signup" className={cm.cn(cm.fontWeight('bold'), cm.textPrimary)}>
            {t('login.signupLink', {}, { defaultValue: 'Create your journal' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
        <AuthInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          icon="mail"
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        />
        <AuthInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          icon="lock"
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
        />
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <label
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'cursor-pointer text-on-surface-variant',
            )}
          >
            <input
              type="checkbox"
              className={cm.cn('w-4 h-4 rounded border-outline-variant accent-primary')}
            />
            {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
          </label>
          <Link
            to="/forgot-password"
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary)}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>

        {error ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('base'),
            'w-full text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed',
          )}
          style={{
            background:
              'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
          }}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('my', 4))}>
          <div className={cm.cn('flex-1 h-px bg-outline-variant')} />
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('common.or', {}, { defaultValue: 'or' })}
          </span>
          <div className={cm.cn('flex-1 h-px bg-outline-variant')} />
        </div>

        <OAuthButtons />
      </form>
    </AuthShell>
  )
}
