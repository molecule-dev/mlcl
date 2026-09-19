import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SwitchboardAuthShell } from '../components/SwitchboardAuthShell.js'

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
      /* Error tracked in hook state */
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <SwitchboardAuthShell
      eyebrow={t('login.eyebrow', {}, { defaultValue: 'Staff sign in' })}
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Sign in to the front desk workspace — reservations, room board, and the voice line.',
        },
      )}
      footer={
        <>
          <span className="text-on-surface-variant">
            {t(
              'login.noAccount',
              { appName: APP_NAME },
              { defaultValue: 'New to {{appName}}?' },
            )}{' '}
          </span>
          <Link
            to="/signup"
            className={'text-primary font-bold hover:underline'}
            data-mol-id="login-signup-link"
          >
            {t('login.signupLink', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        aria-label={t('login.formLabel', {}, { defaultValue: 'Sign in form' })}
      >
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            data-mol-id="login-email"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
              data-mol-id="login-forgot-link"
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            data-mol-id="login-password"
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>

        {error ? (
          <p
            data-mol-id="login-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {error.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          data-mol-id="login-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </form>

      <OAuthButtons />
    </SwitchboardAuthShell>
  )
}
