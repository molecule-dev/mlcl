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
      // tracked in hook state — the hook surfaces requestError; no action needed here
    }
  }

  return (
    <AuthShell
      heading={t('forgotPassword.heading', {}, { defaultValue: 'Reset your password.' })}
      subheading={t(
        'forgotPassword.subheading',
        { appName: APP_NAME },
        {
          defaultValue:
            "Enter the email tied to your {{appName}} account and we'll send a reset link.",
        },
      )}
      footerPrompt={
        <span>
          {t('forgotPassword.rememberPrompt', {}, { defaultValue: 'Remembered it? ' })}
          <Link to="/login" className={cm.cn('font-bold text-indigo-700 hover:text-indigo-900')}>
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </span>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 5),
            cm.stack(2),
            'rounded-xl bg-success-light border border-emerald-200 text-success-text',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t('forgotPassword.successHeading', {}, { defaultValue: 'Check your inbox.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  'We sent a reset link to {{email}}. It expires in an hour — give the inbox a sec.',
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.stack(4))}>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'forgotPassword.emailPlaceholder',
                {},
                { defaultValue: 'you@team.com' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'w-full rounded-xl border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all',
              )}
            />
          </label>
          {requestError && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('p', 3),
                'rounded-lg bg-error-light text-error border border-red-200',
              )}
            >
              {requestError.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'w-full rounded-xl text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-secondary) 100%)',
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
