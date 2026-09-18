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
      /* tracked in hook */
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      heading={t('forgotPassword.heading', {}, { defaultValue: 'Forgot your password?' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter the email tied to your account and we’ll send a reset link.' },
      )}
      footerRight={
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('semibold'),
            'text-primary hover:underline decoration-2 underline-offset-4',
          )}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div className={cm.cn(cm.stack(4), cm.textCenter)}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full mx-auto',
            )}
            style={{
              width: 56,
              height: 56,
              backgroundColor: 'var(--chalk-available-light)',
              color: 'var(--chalk-available)',
            }}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-3xl')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
          </span>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'font-display')}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgotPassword.success.body',
              { email },
              { defaultValue: 'We sent a reset link to {{email}} — it expires in 30 minutes.' },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.stack(5)}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <span className={cm.cn('relative block')}>
              <span
                aria-hidden="true"
                className={cm.cn(
                  'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
                )}
              >
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={cm.cn(
                  cm.w('full'),
                  cm.textSize('sm'),
                  'pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
                )}
                placeholder={`you@${APP_NAME.toLowerCase()}.app`}
              />
            </span>
          </label>

          {requestError && (
            <p
              role="alert"
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('p', 3),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {requestError.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              'rounded-xl py-3.5 text-on-primary shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 100%)',
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
