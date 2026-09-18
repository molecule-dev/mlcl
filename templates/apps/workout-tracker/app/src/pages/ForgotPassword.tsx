import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ForjaAuthShell } from '../components/ForjaAuthShell.js'
import { ForjaTextField } from '../components/ForjaTextField.js'
import { loadContent } from '../config.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // Error tracked in hook state — hook surfaces it to the UI
    }
  }

  return (
    <ForjaAuthShell
      heading={t('forja.forgot.heading', {}, { defaultValue: 'Reset your password.' })}
      subheading={t(
        'forja.forgot.subheading',
        {},
        { defaultValue: "Enter your email and we'll send you a reset link." },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-primary-dark hover:underline uppercase tracking-wide',
          )}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 5),
            'rounded-xl bg-success-container/40 border border-success/30 text-on-surface',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-3xl text-success')}
          >
            mark_email_read
          </span>
          <p className={cm.cn('font-semibold')}>
            {t(
              'forja.forgot.success',
              { email },
              { defaultValue: "We've sent a reset link to {{email}} — check your inbox." },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <ForjaTextField
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            type="email"
            autoComplete="email"
            required
            placeholder={t(
              'forja.login.emailPlaceholder',
              {},
              { defaultValue: 'lifter@forja.app' },
            )}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {requestError ? (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-lg bg-error-container text-on-error-container',
              )}
            >
              {requestError.message}
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
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}

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
