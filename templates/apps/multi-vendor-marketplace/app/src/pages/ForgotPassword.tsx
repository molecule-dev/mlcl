import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VendryAuthShell } from '../components/VendryAuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
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
      // Error tracked in hook state — the hook surfaces it via its own error field
    }
  }

  return (
    <VendryAuthShell
      heading={t('forgotPassword.heading', {}, { defaultValue: 'Forgot your password?' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        {
          defaultValue:
            "No worries — we'll email you a reset link so you can get back to your shop.",
        },
      )}
      bottomPrompt={
        <>
          {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
          <Link
            to="/login"
            className={'font-semibold text-orange-700 dark:text-primary hover:underline'}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </>
      }
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className={cm.cn(cm.stack(5))}>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('forgotPassword.emailLabel', {}, { defaultValue: 'Account email' })}
            </span>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container-low border border-outline-variant focus-within:border-primary transition-colors',
              )}
            >
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
                alternate_email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cm.cn(
                  cm.w('full'),
                  'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant',
                )}
              />
            </div>
          </label>

          {requestError && (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                cm.textCenter,
                'rounded-xl bg-error/10 text-error',
              )}
            >
              {requestError.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.sp('py', 4),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              send
            </span>
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('forgotPassword.submit', {}, { defaultValue: 'Email reset link' })}
          </button>
        </form>
      ) : (
        <div className={cm.cn(cm.stack(5), cm.textCenter)}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(16),
              cm.h(16),
              'mx-auto rounded-full bg-success/15 text-success',
            )}
            aria-hidden
          >
            <span className="material-symbols-outlined text-3xl">mark_email_read</span>
          </span>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface')}>
            {t(
              'forgotPassword.success',
              { email },
              {
                defaultValue:
                  "Check {{email}} for a reset link — it's good for the next 30 minutes.",
              },
            )}
          </p>
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('py', 3),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary-dark transition-colors',
            )}
          >
            {t('forgotPassword.continue', {}, { defaultValue: 'I have my reset code' })}
          </button>
        </div>
      )}
    </VendryAuthShell>
  )
}

export default ForgotPassword
