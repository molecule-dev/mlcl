import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesAuthShell } from '../components/RushesAuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestReset, requestStatus, requestError } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)

  const isSubmitting = requestStatus === 'pending'
  const error = requestError
    ? requestError instanceof Error
      ? requestError.message
      : String(requestError)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error is tracked in hook state via requestReset's own error handling
    }
  }

  if (submitted) {
    return (
      <RushesAuthShell
        heading={t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
        subheading={t(
          'auth.backToSignInArrow',
          { email },
          { defaultValue: `We sent a reset link to ${email}.` },
        )}
        footer={
          <Link
            to="/login"
            className={
              'text-[var(--video-link)] hover:text-[var(--video-link-hover)] font-medium transition-colors'
            }
          >
            {t('forgotPassword.backToLogin', {}, { defaultValue: '← Back to sign in' })}
          </Link>
        }
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 8),
            'rounded-lg border border-[var(--video-cta-from)]/40 bg-[var(--video-cta-from)]/10',
          )}
        >
          <span className="material-symbols-outlined text-[64px] text-[var(--video-link)]">
            mark_email_read
          </span>
        </div>
      </RushesAuthShell>
    )
  }

  return (
    <RushesAuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter your email and we\u2019ll send a reset link.' },
      )}
      footer={
        <Link
          to="/login"
          className={
            'text-[var(--video-link)] hover:text-[var(--video-link-hover)] font-medium transition-colors'
          }
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="forgot-password-form">
        <div>
          <label
            htmlFor="email"
            className={cm.cn(
              cm.textSize('xs'),
              'block font-mono uppercase tracking-widest text-[var(--video-text-muted-alt)] mb-1.5',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="editor@rushes.studio"
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-lg bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:ring-1 focus:ring-[var(--video-cta-from)]/40 focus:outline-none transition-colors placeholder:text-[var(--video-text-dim)]',
            )}
          />
        </div>

        {error && (
          <p
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          data-mol-id="forgot-password-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg text-white bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] hover:from-[var(--video-cta-from-hover)] hover:to-[var(--video-cta-to-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span>
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>send</span>
        </button>
      </form>
    </RushesAuthShell>
  )
}

export default ForgotPassword
