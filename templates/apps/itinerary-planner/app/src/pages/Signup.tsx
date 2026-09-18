import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { WaypointAuthShell } from '../components/WaypointAuthShell.js'
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
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before each modal opens.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  const legalLinkClass = cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* Error tracked in hook state */
    }
  }

  return (
    <WaypointAuthShell
      eyebrow={t('signup.eyebrow', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
      heading={t('signup.heading', {}, { defaultValue: 'Plan it once. Wander it together.' })}
      subheading={t(
        'signup.subheading',
        {},
        {
          defaultValue:
            'Create an account to share trips with up to 5 collaborators, sync bookings, and pull every confirmation into one place.',
        },
      )}
      footer={
        <>
          <span className="text-on-surface-variant">
            {t('signup.haveAccount', {}, { defaultValue: 'Already wandering?' })}{' '}
          </span>
          <Link to="/login" className={'text-primary font-bold hover:underline'}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.name', {}, { defaultValue: 'Your name' })}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Iris Larsen' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
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
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
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
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isSigningUp
            ? t(
                'common.creatingYourAccountEllipsis',
                {},
                { defaultValue: 'Creating your account…' },
              )
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </form>

      <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
        {t('signup.termsPrefix', {}, { defaultValue: 'By creating an account you agree to our' })}{' '}
        <button type="button" onClick={openTerms} className={legalLinkClass}>
          {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        </button>{' '}
        {t('signup.and', {}, { defaultValue: 'and' })}{' '}
        <button type="button" onClick={openPrivacy} className={legalLinkClass}>
          {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        </button>
        .
      </p>

      <OAuthButtons />
      {modals}
    </WaypointAuthShell>
  )
}
