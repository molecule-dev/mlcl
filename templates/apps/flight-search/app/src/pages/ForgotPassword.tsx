import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SkylarkAuthShell } from '../components/SkylarkAuthShell.js'

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
      // Error tracked in hook state via requestReset
    }
  }

  return (
    <SkylarkAuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        { app: APP_NAME },
        {
          defaultValue:
            'Enter the email on your {{app}} account and we will send a secure reset link.',
        },
      )}
      footer={
        <Link to="/login" className={'text-primary font-bold hover:underline'}>
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            'rounded-2xl bg-cheapest-light text-cheapest ring-1 ring-cheapest/30 text-center',
          )}
        >
          <span
            className="material-symbols-outlined text-3xl"
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mark_email_read
          </span>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'uppercase tracking-widest')}
          >
            {t('forgotPassword.successHeading', {}, { defaultValue: 'Reset link sent' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-cheapest/85')}>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  'Check {{email}} for a link to set a new password. Link expires in 30 minutes.',
              },
            )}
          </p>
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
              'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-lg disabled:opacity-60',
            )}
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              send
            </span>
          </button>
        </form>
      )}
    </SkylarkAuthShell>
  )
}
