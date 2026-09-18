import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EmbarkAuthShell } from '../components/EmbarkAuthShell.js'
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
    <EmbarkAuthShell
      heading={t('auth.login.heading', {}, { defaultValue: 'Welcome back.' })}
      subheading={t(
        'auth.login.subheading',
        {},
        { defaultValue: 'Sign in to pick up your onboarding journey where you left off.' },
      )}
      error={error?.message}
      footer={
        <>
          {t('auth.login.signupPrompt', {}, { defaultValue: 'New to your team?' })}{' '}
          <Link to="/signup" className="font-bold text-primary">
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
        <div>
          <label
            htmlFor="email"
            className="block text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant"
            style={{ marginBottom: '8px' }}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t(
              'auth.login.emailPlaceholder',
              {},
              { defaultValue: 'name@yourcompany.com' },
            )}
            className="bg-surface-container-lowest transition-all"
            style={{ padding: '14px 16px' }}
          />
        </div>
        <div>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
            style={{ marginBottom: '8px' }}
          >
            <label
              htmlFor="password"
              className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant"
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link to="/forgot-password" className="font-medium text-primary">
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder={t('auth.login.passwordPlaceholder', {}, { defaultValue: 'Your password' })}
            className="bg-surface-container-lowest transition-all"
            style={{ padding: '14px 16px' }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoggingIn}
          className="font-bold text-white transition-all duration-200"
          style={{
            marginTop: '8px',
            padding: '14px',
            borderRadius: '12px',
            background:
              'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
            boxShadow: '0 10px 24px -10px rgba(13, 148, 136, 0.5)',
            opacity: isLoggingIn ? 0.7 : 1,
          }}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.submit', {}, { defaultValue: 'Continue your journey' })}
        </button>
      </form>

      <div className={cm.cn(cm.sp('mt', 8))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'var(--color-border, var(--mol-color-background-tertiary))',
            }}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
            {t('common.or', {}, { defaultValue: 'or' })}
          </span>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'var(--color-border, var(--mol-color-background-tertiary))',
            }}
          />
        </div>
        <div className={cm.sp('mt', 4)}>
          <OAuthButtons />
        </div>
      </div>
    </EmbarkAuthShell>
  )
}
