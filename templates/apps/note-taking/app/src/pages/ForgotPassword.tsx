import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VersoAuthShell } from '../components/VersoAuthShell.js'
import { VersoInput } from '../components/VersoInput.js'

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
      // Error tracked in hook state; no additional handling needed here
    }
  }

  return (
    <VersoAuthShell
      eyebrow={t('forgot.eyebrow', {}, { defaultValue: 'Lost the way back in?' })}
      headline={t('forgot.headline', {}, { defaultValue: 'Reset your password.' })}
      subline={t(
        'forgot.subline',
        {},
        { defaultValue: "We'll send a one-time link to your inbox so you can choose a new one." },
      )}
      formTitle={t('forgot.formTitle', {}, { defaultValue: 'Forgot password' })}
      formSubtitle={t('forgot.formSubtitle', {}, { defaultValue: 'Tell us the email on file.' })}
      footer={
        <p className={cm.cn('text-center text-on-surface-variant')}>
          {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
          <Link
            to="/login"
            className={cm.cn('font-bold text-primary hover:opacity-80 transition-opacity')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
          <VersoInput
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('py', 3),
              'rounded-xl font-bold text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-60',
            )}
          >
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
          {requestError ? (
            <p className={cm.cn('text-sm text-error font-semibold')}>{requestError.message}</p>
          ) : null}
        </form>
      ) : (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 6),
            cm.stack(3),
          )}
          style={{
            backgroundColor: 'var(--color-tertiary-container, var(--color-primary-light))',
            borderRadius: '1rem',
            textAlign: 'center',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl')}
            style={{ color: 'var(--color-primary, #3b5fc0)' }}
          >
            mark_email_read
          </span>
          <p className={cm.cn('font-bold')}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </p>
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t(
              'forgot.successDetail',
              {},
              { defaultValue: 'We sent a reset link to your email. It expires in 30 minutes.' },
            )}
          </p>
        </div>
      )}
    </VersoAuthShell>
  )
}

export default ForgotPassword
