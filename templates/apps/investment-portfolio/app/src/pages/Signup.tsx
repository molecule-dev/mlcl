import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ArgentAuthShell } from '../components/ArgentAuthShell.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before each modal opens.
  // The standalone /privacy and /terms routes still exist for deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  const legalLinkClass = cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via signup status/error
    }
  }

  return (
    <ArgentAuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Open an account' })}
      heading={t(
        'signup.heading',
        { appName: APP_NAME },
        { defaultValue: 'Open your {{appName}} account' },
      )}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Free for 30 days. No card required. Cancel anytime.' },
      )}
      footerLink={{
        to: '/login',
        promptKey: 'signup.loginPrompt',
        promptDefault: 'Already have an account?',
        ctaKey: 'signup.loginCta',
        ctaDefault: 'Sign in',
      }}
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <FloatingInput
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder={t('form.fullName', {}, { defaultValue: 'Full name' })}
        />
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
          autoComplete="new-password"
          required
          placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
        />

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
          {t(
            'signup.legalPrefix',
            { appName: APP_NAME },
            { defaultValue: 'By creating an account you agree to the {{appName}}' },
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

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'bg-primary text-on-primary rounded-full hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            {isSigningUp ? 'progress_activity' : 'arrow_forward'}
          </span>
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
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
      {modals}
    </ArgentAuthShell>
  )
}
