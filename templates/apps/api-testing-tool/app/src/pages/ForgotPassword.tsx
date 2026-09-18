import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

const INPUT_BG = 'var(--color-background)'
const BORDER = 'var(--color-border)'

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
      // hook owns error state — usePasswordReset surfaces it via requestError
    }
  }

  return (
    <AuthShell
      title={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subtitle={t(
        'auth.forgotPassword.enterEmailDescription',
        {},
        { defaultValue: 'Enter your email and we will send you a reset link.' },
      )}
      statusLabel={t('forgotPassword.statusLabel', {}, { defaultValue: 'reset · secure tunnel' })}
      footer={
        <Link
          to="/login"
          className={cm.cn('inline-flex items-center gap-1 font-bold hover:underline')}
          style={{ color: 'var(--color-primary)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            cm.textSize('sm'),
            'rounded-md text-center',
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-success) 40%, transparent)',
            color: 'var(--color-success)',
          }}
          role="status"
          data-mol-id="forgot-success"
        >
          <span
            className={cm.cn('material-symbols-outlined text-2xl mb-2 block')}
            aria-hidden="true"
          >
            mark_email_read
          </span>
          {t(
            'forgotPassword.success',
            {},
            {
              defaultValue:
                'If an account exists for that email, a reset link is on its way. Check your inbox.',
            },
          )}
        </div>
      ) : (
        <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
          <div>
            <label
              className={cm.cn(
                'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
              )}
              style={{ color: 'var(--color-text-secondary)' }}
              htmlFor="email"
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.textSize('sm'),
                'rounded-md font-mono transition-colors',
              )}
              style={{
                backgroundColor: INPUT_BG,
                border: `1px solid ${BORDER}`,
                color: 'var(--color-text-primary)',
              }}
              data-mol-id="forgot-email"
            />
          </div>

          {requestError ? (
            <div
              data-mol-id="forgot-error"
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-md text-center',
              )}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                color: 'var(--color-error)',
              }}
            >
              {requestError.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 12px 28px -12px color-mix(in srgb, var(--color-primary) 60%, transparent)',
            }}
            data-mol-id="forgot-submit"
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
