import { useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { FormField } from './Login.js'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // requestError state from usePasswordReset surfaces this to the UI
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgot.subheading',
        {},
        { defaultValue: 'Enter your work email and we will ship a reset link to your inbox.' },
      )}
      bottomLinkText={t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}
      bottomLinkLabel={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
      bottomLinkTo="/login"
    >
      {submitted ? (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 5),
            cm.stack(2),
            'rounded-xl border border-secondary/30 bg-secondary/10 text-on-surface',
          )}
        >
          <p
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'text-secondary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="mark_email_read"
            >
              mark_email_read
            </span>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgot.successBody',
              { email },
              {
                defaultValue:
                  'If {{email}} is on the team, a reset link is on its way. The link expires in 30 minutes.',
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.w('full'), cm.stack(5))}>
          <FormField
            icon="alternate_email"
            label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="ops@yourwarehouse.com"
            required
          />

          {requestError && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-error-container text-on-error-container border border-error/20',
              )}
            >
              {requestError.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.h(12),
              cm.fontWeight('bold'),
              'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all',
            )}
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="send">
              send
            </span>
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
