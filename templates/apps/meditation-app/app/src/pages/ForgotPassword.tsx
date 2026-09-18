import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { StillpointAuthShell } from '../components/StillpointAuthShell.js'
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

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // Error tracked in hook state via requestError
    }
  }

  return (
    <StillpointAuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={
        submitted
          ? t(
              'stillpoint.forgot.success',
              { email },
              { defaultValue: "We've sent a reset link to {{email}}." },
            )
          : t(
              'stillpoint.forgot.subheading',
              {},
              { defaultValue: "Enter your email and we'll send a reset link." },
            )
      }
      footer={
        <Link
          to="/login"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <FloatingInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
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
              'w-full h-[48px] bg-accent hover:bg-accent/90 text-on-accent rounded-xl shadow-sm shadow-accent/20 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'start', gap: 'sm' }),
              cm.sp('p', 4),
              'rounded-2xl bg-primary-container text-on-primary-container',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-2xl')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
              {t(
                'stillpoint.forgot.checkEmail',
                {},
                { defaultValue: 'Check your inbox — the link expires in 30 minutes.' },
              )}
            </p>
          </div>
        </div>
      )}

      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          'mt-2',
        )}
      >
        <LegalModalLinks
          linkClassName={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </StillpointAuthShell>
  )
}
