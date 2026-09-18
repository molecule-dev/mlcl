import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      /* error rendered below via requestError hook state */
    }
  }

  return (
    <AuthShell
      heading={
        submitted
          ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
          : t('forgotPassword.heading', {}, { defaultValue: 'Reset access' })
      }
      tagline={
        submitted
          ? t(
              'forgotPassword.successTagline',
              {},
              { defaultValue: 'A signed reset link is on the way.' },
            )
          : t(
              'forgotPassword.tagline',
              {},
              { defaultValue: 'Enter your email to receive a signed reset link.' },
            )
      }
      footer={
        <>
          <Link
            to="/login"
            className={cm.cn(
              'font-headline font-medium text-text underline decoration-border underline-offset-4 transition-colors hover:text-primary',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </>
      }
    >
      {submitted ? (
        <div className={cm.cn('flex flex-col items-center gap-4 text-center')}>
          <span
            aria-hidden="true"
            className={cm.cn(
              'inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
              mark_email_read
            </span>
          </span>
          <p className={cm.cn('font-mono text-sm text-muted')}>
            {t(
              'forgotPassword.checkInbox',
              { email },
              {
                defaultValue:
                  'If {email} is registered, a signed reset link will arrive within a minute.',
              },
            )}
          </p>
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className={cm.cn(
              'inline-flex h-9 items-center gap-2 rounded border border-primary/30 bg-primary/10 px-4 font-headline text-sm font-semibold text-primary',
              'transition-colors hover:border-primary hover:bg-primary hover:text-on-primary',
            )}
          >
            {t('forgotPassword.haveToken', {}, { defaultValue: 'I have the reset token' })}
          </button>
        </div>
      ) : (
        <form className={cm.cn('flex flex-col gap-5')} onSubmit={handleSubmit}>
          <div className={cm.cn('space-y-1.5')}>
            <label
              htmlFor="forgot-email"
              className={cm.cn(
                'block font-mono text-[11px] font-bold uppercase tracking-widest text-muted',
              )}
            >
              {t('forgotPassword.email', {}, { defaultValue: 'Account email' })}
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
                placeholder="you@arcanum.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  'h-10 w-full rounded border border-border bg-background pl-10 pr-3 font-mono text-sm text-text',
                  'placeholder:text-muted/40',
                  'transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              />
            </div>
          </div>

          {requestError && (
            <div
              role="alert"
              data-mol-id="forgot-error"
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
              'flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-headline font-bold text-on-primary',
              'transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
              'disabled:opacity-60',
            )}
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

export default ForgotPassword
