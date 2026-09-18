import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { WaypointAuthShell } from '../components/WaypointAuthShell.js'

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
      /* Error tracked in hook state */
    }
  }

  return (
    <WaypointAuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Recover your itinerary' })}
      heading={
        submitted
          ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
          : t('forgotPassword.heading', {}, { defaultValue: 'Forgot your password?' })
      }
      subheading={
        submitted
          ? t(
              'forgotPassword.successSubheading',
              { email },
              {
                defaultValue:
                  'We sent a recovery link to {{email}}. The link is valid for 30 minutes.',
              },
            )
          : t(
              'forgotPassword.subheading',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Enter the email you used for {{appName}} and we will send a link to reset your password.',
              },
            )
      }
      footer={
        <Link to="/login" className={'text-primary font-bold hover:underline'}>
          ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <p
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-xl bg-cyan-50 dark:bg-cyan-900/20 text-on-surface border border-cyan-200/60 dark:border-cyan-700/40',
            )}
          >
            {t(
              'forgotPassword.successHint',
              {},
              {
                defaultValue:
                  'No email yet? Check your spam folder, or try again with a different address.',
              },
            )}
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'w-full rounded-xl border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors',
            )}
          >
            {t('forgotPassword.tryAgain', {}, { defaultValue: 'Send to a different email' })}
          </button>
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
              ? t('forgotPassword.submitPending', {}, { defaultValue: 'Sending recovery email…' })
              : t('forgotPassword.submit', {}, { defaultValue: 'Send recovery email' })}
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              send
            </span>
          </button>
        </form>
      )}
    </WaypointAuthShell>
  )
}
