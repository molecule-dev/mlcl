import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthAlert, AuthSubmitButton, AuthTextField } from '../components/AuthFormAtoms.js'
import { SiftAuthShell } from '../components/SiftAuthShell.js'

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error is tracked in requestError hook state; no local handling needed
    }
  }

  return (
    <SiftAuthShell
      heading={t('forgotPassword.heading', {}, { defaultValue: 'Forgot your password?' })}
      subheading={t(
        'auth.forgotPassword.enterEmailDescription',
        {},
        { defaultValue: 'Enter your email and we will send you a reset link.' },
      )}
      footer={
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <p>
            {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-primary hover:underline underline-offset-4',
              )}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
          <p>
            {t('forgotPassword.newHere', {}, { defaultValue: 'New here?' })}{' '}
            <Link
              to="/signup"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-primary hover:underline underline-offset-4',
              )}
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </p>
        </div>
      }
    >
      {submitted ? (
        <div className={cm.cn('space-y-5')}>
          <AuthAlert tone="success">
            {t(
              'forgotPassword.success',
              { email },
              { defaultValue: 'Reset link sent to {{email}}. Check your inbox.' },
            )}
          </AuthAlert>
          <Link
            to="/login"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'w-full rounded-xl border-2 border-outline-variant text-on-surface uppercase tracking-wider hover:bg-surface-container transition-colors',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </div>
      ) : (
        <form
          data-mol-id="forgot-password-form"
          onSubmit={handleSubmit}
          className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
        >
          {requestError && <AuthAlert tone="error">{requestError.message}</AuthAlert>}
          <AuthTextField
            id="email"
            label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            value={email}
            onChange={setEmail}
            icon="mail"
            type="email"
            autoComplete="email"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
          />
          <AuthSubmitButton
            loading={isSubmitting}
            loadingLabel={t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })}
            label={t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          />
        </form>
      )}
    </SiftAuthShell>
  )
}
