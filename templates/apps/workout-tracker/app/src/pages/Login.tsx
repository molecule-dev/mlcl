import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ForjaAuthShell } from '../components/ForjaAuthShell.js'
import { ForjaTextField } from '../components/ForjaTextField.js'
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

  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state — hook surfaces it to the UI
    }
  }

  return (
    <ForjaAuthShell
      heading={t('forja.login.heading', {}, { defaultValue: 'Welcome back, lifter.' })}
      subheading={t(
        'forja.login.subheading',
        {},
        { defaultValue: 'Pick the bar up where you left it.' },
      )}
      footer={
        <>
          {t(
            'forja.login.signupPrompt',
            { appName: APP_NAME },
            { defaultValue: 'New to {{appName}}?' },
          )}{' '}
          <Link
            to="/signup"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary-dark hover:underline ml-1 uppercase tracking-wide',
            )}
          >
            {t('forja.login.signupLink', {}, { defaultValue: 'Forge your account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <ForjaTextField
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          autoComplete="email"
          required
          placeholder={t('forja.login.emailPlaceholder', {}, { defaultValue: 'lifter@forja.app' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ForjaTextField
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          autoComplete="current-password"
          required
          withPasswordToggle
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mt-1')}>
          <label className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'cursor-pointer group')}>
            <input
              type="checkbox"
              className={cm.cn('w-4 h-4 rounded-sm border-outline text-primary focus:ring-primary')}
            />
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant group-hover:text-on-surface transition-colors',
              )}
            >
              {t('forja.login.rememberMe', {}, { defaultValue: 'Keep me signed in' })}
            </span>
          </label>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary-dark hover:underline uppercase tracking-wide',
            )}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>

        {error ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-primary hover:bg-primary-light text-on-primary rounded-lg shadow-md shadow-primary/30 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wide',
          )}
        >
          {isSubmitting
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>

        <OAuthButtons />
      </form>

      <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
        {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
        <button
          type="button"
          onClick={openTerms}
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('nav.terms', {}, { defaultValue: 'Terms' })}
        </button>{' '}
        {t('common.and', {}, { defaultValue: 'and' })}{' '}
        <button
          type="button"
          onClick={openPrivacy}
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </button>
      </p>
      {modals}
    </ForjaAuthShell>
  )
}
