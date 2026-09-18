import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DriftboardAuthShell } from '../components/DriftboardAuthShell.js'
import { DriftInput } from '../components/DriftInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
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
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state (error from useSignup)
    }
  }

  return (
    <DriftboardAuthShell
      eyebrow={t(
        'signup.eyebrow',
        { appName: APP_NAME },
        { defaultValue: 'Join your team on {{appName}}' },
      )}
      headline={t(
        'signup.headline',
        {},
        { defaultValue: 'Boards, lists, cards. Start in 60 seconds.' },
      )}
      subline={t(
        'signup.subline',
        {},
        {
          defaultValue:
            'Free for teams up to five — no credit card. Bring your boards or start fresh.',
        },
      )}
      formTitle={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      formSubtitle={t(
        'signup.formSubtitle',
        {},
        { defaultValue: "We'll spin up your workspace and your first board automatically." },
      )}
      footer={
        <>
          <p className="text-center text-on-surface-variant">
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(`font-bold text-primary hover:opacity-80 transition-opacity`)}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
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
              data-mol-id="signup-terms-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              data-mol-id="signup-privacy-link"
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
          label={t('form.fullName', {}, { defaultValue: 'Full name' })}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Sarah Chen"
        />
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
          autoComplete="new-password"
          required
          placeholder="••••••••"
          hint={t('signup.passwordHint', {}, { defaultValue: 'At least 8 characters.' })}
        />
        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('py', 3),
            'rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-60',
          )}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('signup.submit', {}, { defaultValue: 'Create my workspace' })}
        </button>
        {error ? (
          <p className={cm.cn(`text-sm text-error font-semibold`)}>{error.message}</p>
        ) : null}
      </form>
      <OAuthButtons />
    </DriftboardAuthShell>
  )
}

export default Signup
