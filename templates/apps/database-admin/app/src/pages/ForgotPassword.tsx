import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      /* error rendered below via requestError */
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      tagline={t(
        'forgotPassword.tagline',
        {},
        { defaultValue: 'Enter your email — we’ll send a recovery link.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            'font-headline font-medium text-text underline decoration-border underline-offset-4 transition-colors hover:text-primary',
          )}
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div
          role="status"
          data-mol-id="forgot-password-success"
          className={cm.cn(
            'rounded border border-primary/30 bg-primary/10 p-4 text-center font-mono text-sm text-text',
          )}
        >
          {t(
            'forgotPassword.success',
            {},
            { defaultValue: 'If that account exists, a reset link is on its way.' },
          )}
        </div>
      ) : (
        <form className={cm.cn('flex flex-col gap-5')} onSubmit={handleSubmit}>
          <div className={cm.cn('space-y-1.5')}>
            <label
              htmlFor="forgot-email"
              className={cm.cn(
                'block font-label text-[11px] font-bold uppercase tracking-widest text-muted',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <div className={cm.cn('relative flex items-center')}>
              <span
                aria-hidden="true"
                className={cm.cn(
                  'material-symbols-outlined pointer-events-none absolute left-3 text-lg text-muted/60',
                )}
              >
                mail
              </span>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  'h-10 w-full rounded border border-border bg-bg pl-10 pr-3 font-mono text-sm text-text',
                  'placeholder:text-muted/40',
                  'transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              />
            </div>
          </div>

          {requestError && (
            <div
              role="alert"
              data-mol-id="forgot-password-error"
              className={cm.cn(
                'rounded border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error',
              )}
            >
              {requestError.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              'group mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-headline font-bold text-on-primary',
              'transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
              'disabled:opacity-60',
            )}
          >
            <span>
              {isSubmitting
                ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
                : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            </span>
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-sm font-bold')}
            >
              send
            </span>
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
