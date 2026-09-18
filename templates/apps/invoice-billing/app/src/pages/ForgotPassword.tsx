import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'

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
      // Error tracked in hook state via requestReset's own status
    }
  }

  return (
    <AuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Forgot password' })}
      title={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subtitle={t(
        'forgotPassword.subtitle',
        { appName: APP_NAME },
        {
          defaultValue:
            "Enter the email tied to your {{appName}} account and we'll send a reset link.",
        },
      )}
      footnote={
        <p
          style={{
            fontSize: '13px',
            color: 'var(--mol-color-text-secondary)',
            textAlign: 'center',
          }}
        >
          <Link
            to="/login"
            style={{ color: 'var(--color-sidebar-hover)', fontWeight: 600, textDecoration: 'none' }}
          >
            {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
          </Link>
        </p>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-paid-light)',
            color: 'var(--color-paid)',
            borderRadius: '14px',
            border: '1px solid var(--color-paid-light)',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          <span
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.fontWeight('bold'))}
            style={{ color: 'var(--mol-color-success)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              mark_email_read
            </span>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </span>
          <span>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  "We've sent reset instructions to {{email}}. The link expires in 30 minutes.",
              },
            )}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--mol-color-text-secondary)',
                fontWeight: 700,
              }}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@yourstudio.com"
              aria-label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid var(--mol-color-border)',
                backgroundColor: 'var(--mol-color-surface-secondary)',
                fontSize: '14px',
                color: 'var(--mol-color-text)',
                outline: 'none',
              }}
            />
          </label>
          {requestError ? (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-overdue-light)',
                color: 'var(--color-overdue)',
                fontSize: '13px',
                borderRadius: '10px',
                border:
                  '1px solid color-mix(in srgb, var(--mol-color-error) 40%, var(--mol-color-surface))',
              }}
            >
              {requestError.message}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(cm.fontWeight('bold'))}
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-sidebar-text-active)',
              fontSize: '14px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 8px 22px var(--color-accent-shadow)',
            }}
          >
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
