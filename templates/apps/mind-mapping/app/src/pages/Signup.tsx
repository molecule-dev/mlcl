import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DendriteAuthCard } from '../components/DendriteAuthCard.js'
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
      // tracked in hook state via error
    }
  }

  return (
    <DendriteAuthCard
      heading={t('signup.heading', {}, { defaultValue: 'Plant your first idea' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Free forever for 5 maps. No credit card required.' },
      )}
      brandStatement={t(
        'signup.brandStatement',
        {},
        {
          defaultValue:
            'A canvas wide enough for the boldest brainstorm — and quiet enough to think.',
        },
      )}
      footer={
        <>
          <span>
            {t('signup.haveAccount', {}, { defaultValue: 'Already a member?' })}{' '}
            <Link to="/login" className={cm.cn('font-bold text-primary hover:underline')}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </span>
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}>
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
      <form className={cm.cn(cm.stack(5))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container border border-error/30',
            )}
          >
            {error.message}
          </div>
        )}
        <div className={cm.stack(2)}>
          <label
            htmlFor="signup-name"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('auth.signup.name', {}, { defaultValue: 'Your name' })}
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSigningUp}
            placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Avery Chen' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="signup-email"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSigningUp}
            placeholder={t(
              'auth.passwordPlaceholderNameCompany',
              {},
              { defaultValue: 'name@company.com' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="signup-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSigningUp}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
        </div>
        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-transform',
          )}
        >
          {isSigningUp
            ? t(
                'common.creatingYourAccountEllipsis',
                {},
                { defaultValue: 'Creating your account…' },
              )
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            arrow_forward
          </span>
        </button>
      </form>
      <OAuthButtons />
    </DendriteAuthCard>
  )
}

export default Signup
