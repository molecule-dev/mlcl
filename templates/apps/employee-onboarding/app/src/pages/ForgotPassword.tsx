import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { EmbarkAuthShell } from '../components/EmbarkAuthShell.js'

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
      // Error tracked in hook state
    }
  }

  return (
    <EmbarkAuthShell
      heading={t('auth.forgotPassword.heading', {}, { defaultValue: 'Reset your password.' })}
      subheading={
        submitted
          ? t(
              'auth.forgotPassword.successSubheading',
              {},
              { defaultValue: "Check your inbox — we've sent reset instructions." },
            )
          : t(
              'auth.forgotPassword.subheading',
              {},
              { defaultValue: 'Enter your work email and we will send you a reset link.' },
            )
      }
      error={requestError?.message}
      panelHeadline={t(
        'auth.forgotPassword.panel.headline',
        {},
        { defaultValue: 'Right back where you left off.' },
      )}
      panelBody={t(
        'auth.forgotPassword.panel.body',
        {},
        { defaultValue: 'Reset takes 30 seconds — your checklist progress is waiting.' },
      )}
      footer={
        <Link to="/login" className="font-bold text-primary">
          ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant"
              style={{ marginBottom: '8px' }}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder={t(
                'auth.forgotPassword.emailPlaceholder',
                {},
                { defaultValue: 'name@yourcompany.com' },
              )}
              className="bg-surface-container-lowest transition-all"
              style={{ padding: '14px 16px' }}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="font-bold text-white transition-all duration-200"
            style={{
              padding: '14px',
              borderRadius: '12px',
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
              boxShadow: '0 10px 24px -10px rgba(13, 148, 136, 0.5)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      ) : (
        <div
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl')}
          style={{
            background: 'rgba(13, 148, 136, 0.08)',
            border: '1px solid rgba(13, 148, 136, 0.25)',
          }}
        >
          <div className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '24px', color: 'var(--mol-color-primary)' }}
            >
              mark_email_read
            </span>
            <p className="text-on-surface">
              {t(
                'auth.forgotPassword.successBody',
                { email, appName: APP_NAME },
                {
                  defaultValue: `If an {{appName}} account exists for ${email}, a password reset link has been sent. The link expires in 60 minutes.`,
                },
              )}
            </p>
          </div>
        </div>
      )}
    </EmbarkAuthShell>
  )
}
