import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { SigilAuthShell } from '../components/SigilAuthShell.js'

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

  const isPending = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <SigilAuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Reset' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        { appName: APP_NAME },
        {
          defaultValue:
            'Enter the email tied to your {{appName}} and we will wire you a reset link.',
        },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.textCenter,
            'rounded-md bg-success/10 text-success space-y-2',
          )}
        >
          <span className="material-symbols-outlined text-3xl">mark_email_read</span>
          <p className={cm.cn(cm.fontWeight('bold'))}>
            {t('forgotPassword.successHeading', {}, { defaultValue: 'Reset link wired.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgotPassword.successBody',
              { email },
              {
                defaultValue:
                  "Check {{email}} — if the address is on the ledger we've sent the link.",
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
          <FloatingInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          />

          {requestError ? (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-md bg-error/10 text-error',
              )}
            >
              {requestError.message}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            color="primary"
            disabled={isPending}
            className={cm.cn(cm.w('full'))}
          >
            {isPending
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </Button>
        </form>
      )}
    </SigilAuthShell>
  )
}
