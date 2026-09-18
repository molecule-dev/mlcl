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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
    } catch (_error) {
      // Error tracked in hook state via requestError; no additional handling needed.
    }
  }

  const isSubmitting = requestStatus === 'pending'
  const isSubmitted = requestStatus === 'resolved'

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={
        isSubmitted
          ? t(
              'forgotPassword.successSubheading',
              {},
              {
                defaultValue:
                  'Check your inbox — we just sent a reset link. It expires in 30 minutes.',
              },
            )
          : t(
              'forgotPassword.subheading',
              {},
              { defaultValue: 'Enter your work email and we will send a reset link.' },
            )
      }
      meta={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link to="/login" className={cm.cn('font-semibold text-primary hover:underline')}>
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      {isSubmitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 5),
            cm.flex({ align: 'start', gap: 'sm' }),
            'rounded-lg bg-success/10 border border-success/40',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[20px] text-success shrink-0')}
            aria-hidden="true"
          >
            mark_email_read
          </span>
          <div className={cm.stack(1)}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {t(
                'forgotPassword.sentTo',
                { email },
                { defaultValue: 'Reset link sent to {{email}}' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'forgotPassword.tip',
                {},
                {
                  defaultValue:
                    'Did not arrive? Check spam, or wait 60 seconds and request another.',
                },
              )}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.stack(4)}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </span>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                'h-12 rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-all',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
                aria-hidden="true"
              >
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="you@team.com"
                className={cm.cn(
                  'flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
                )}
              />
            </div>
          </label>

          {requestError ? (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-md bg-error/10 border border-error/40 text-on-surface',
              )}
            >
              {requestError.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              'h-12 rounded-lg bg-primary text-on-primary text-base font-semibold hover:bg-primary-hover disabled:opacity-60 transition-colors',
            )}
          >
            {isSubmitting ? (
              <>
                <span
                  className={cm.cn('material-symbols-outlined animate-spin text-[18px]')}
                  aria-hidden="true"
                >
                  progress_activity
                </span>
                {t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })}
              </>
            ) : (
              t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })
            )}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
