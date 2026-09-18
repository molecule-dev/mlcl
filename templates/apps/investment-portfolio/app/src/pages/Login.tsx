import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ArgentAuthShell } from '../components/ArgentAuthShell.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const { status, error, login } = useLogin()
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before each modal opens.
  // The standalone /privacy and /terms routes still exist for deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  const legalLinkClass = cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // The user resource's log-in handler accepts an optional
      // `twoFactorToken` alongside the credentials — required once the
      // user enables two-factor auth in Settings → Security.
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
      // Error tracked in hook state via login status/error
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <ArgentAuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t(
        'login.heading',
        { appName: APP_NAME },
        { defaultValue: 'Sign in to {{appName}}' },
      )}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Continue managing your portfolio with disciplined rebalancing and clean attribution.',
        },
      )}
      footerLink={{
        to: '/signup',
        promptKey: 'login.signupPrompt',
        promptDefault: 'New to {{appName}}?',
        ctaKey: 'login.signupCta',
        ctaDefault: 'Open an account',
      }}
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <FloatingInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
        />
        <FloatingInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
        />
        <FloatingInput
          type="text"
          value={twoFactorToken}
          onChange={(e) => setTwoFactorToken(e.target.value)}
          autoComplete="one-time-code"
          placeholder={t(
            'login.twoFactorPlaceholder',
            {},
            { defaultValue: '2-factor code (optional)' },
          )}
        />

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'bg-primary text-on-primary rounded-full hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            {isLoggingIn ? 'progress_activity' : 'lock_open'}
          </span>
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>

        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/20',
            )}
          >
            {error.message}
          </p>
        ) : null}
      </form>

      {/* The shared OAuthButtons renders its own "or continue with"
          divider and renders nothing when no OAuth providers are
          configured — no extra chrome needed here. */}
      <OAuthButtons />

      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mt', 6),
          'text-center leading-relaxed text-on-surface-variant',
        )}
      >
        {t(
          'auth.legalConsent.prefix',
          { appName: APP_NAME },
          { defaultValue: 'By continuing, you agree to {{appName}}’s' },
        )}{' '}
        <button type="button" onClick={openTerms} className={legalLinkClass}>
          {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        </button>{' '}
        {t('common.and', {}, { defaultValue: 'and' })}{' '}
        <button type="button" onClick={openPrivacy} className={legalLinkClass}>
          {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        </button>
        {'.'}
      </p>
      {modals}
    </ArgentAuthShell>
  )
}
