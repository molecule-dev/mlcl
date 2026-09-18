import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DriftboardAuthShell } from '../components/DriftboardAuthShell.js'
import { DriftInput } from '../components/DriftInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

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
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state (error from useLogin)
    }
  }

  return (
    <DriftboardAuthShell
      eyebrow={t(
        'login.eyebrow',
        { appName: APP_NAME },
        { defaultValue: 'Welcome back to {{appName}}' },
      )}
      headline={t('login.headline', {}, { defaultValue: 'Pick up where the team left off.' })}
      subline={t(
        'login.subline',
        {},
        {
          defaultValue:
            'Your boards, cards, and realtime presence are waiting — sign in to keep work moving.',
        },
      )}
      formTitle={t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      formSubtitle={t(
        'login.formSubtitle',
        {},
        { defaultValue: 'Use your work email or any connected provider.' },
      )}
      footer={
        <>
          <p className="text-center text-on-surface-variant">
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
            <Link
              to="/signup"
              className={cm.cn(`font-bold text-primary hover:opacity-80 transition-opacity`)}
            >
              {t('login.signupLink', {}, { defaultValue: 'Create one' })}
            </Link>
          </p>
          <p
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textCenter,
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
            <button
              type="button"
              onClick={openTerms}
              data-mol-id="login-terms-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              data-mol-id="login-privacy-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </button>
          </p>
          {modals}
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
        <DriftInput
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
        <DriftInput
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        <div className={cm.flex({ align: 'center', justify: 'end' })}>
          <Link
            to="/forgot-password"
            className={cm.cn(`text-xs font-bold text-primary hover:opacity-80 transition-opacity`)}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 3),
            'rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
        {error ? (
          <p className={cm.cn(`text-sm text-error font-semibold`)}>{error.message}</p>
        ) : null}
      </form>
      <OAuthButtons />
    </DriftboardAuthShell>
  )
}

export default Login
