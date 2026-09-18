import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AlcoveAuthShell } from '../components/AlcoveAuthShell.js'
import { loadContent } from '../config.js'

/**
 * ForgotPassword page — wraps AlcoveAuthShell. Per screen-map.json
 * derivation: only Email field, heading "Reset your password",
 * subtext "Enter your email and we will send a reset link", button
 * "Send reset link", bottom link "Back to Sign In", no OAuth.
 *
 * Translated from hotel-booking's ForgotPassword.tsx.
 */
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
      // Error state is tracked inside the requestReset hook — no action needed here.
    }
  }

  return (
    <AlcoveAuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter your email and we will send you a secure reset link.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'text-primary font-bold hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_back
          </span>
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
            cm.textCenter,
            'rounded-2xl bg-success/10 border border-success/30',
          )}
        >
          <span className="material-symbols-outlined text-4xl text-success" aria-hidden="true">
            mark_email_read
          </span>
          <p className={cm.cn(cm.fontWeight('semibold'))}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  "We've sent reset instructions to {{email}}. The link expires in 30 minutes.",
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
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

          {requestError ? (
            <p
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error/10 text-error border border-error/30',
              )}
            >
              {requestError.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
              'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
            )}
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}

      <div
        className={cm.cn(
          cm.sp('mt', 6),
          cm.flex({ align: 'center', justify: 'center', wrap: 'wrap', gap: 'sm' }),
          cm.textSize('xs'),
          'text-on-surface-variant',
        )}
      >
        <span>{t('auth.legalAgree', {}, { defaultValue: 'By continuing, you agree to our' })}</span>
        <LegalModalLinks
          linkClassName={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          appName={APP_NAME}
          loadContent={loadContent}
        />
      </div>
    </AlcoveAuthShell>
  )
}
