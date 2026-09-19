import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SwitchboardAuthShell } from '../components/SwitchboardAuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const {
    requestStatus: status,
    requestError: error,
    requestReset: forgotPassword,
  } = usePasswordReset()
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [sent, setSent] = useState(false)

  const isSending = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await forgotPassword({ email })
      clearAuthForm()
      setSent(true)
    } catch (_error) {
      /* Error tracked in hook state */
    }
  }

  return (
    <SwitchboardAuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.forgotPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter your email and we will send you a reset link.' },
      )}
      footer={
        <Link
          to="/login"
          className={'text-primary font-bold hover:underline'}
          data-mol-id="forgot-back-link"
        >
          {t('forgotPassword.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {sent ? (
        <p
          data-mol-id="forgot-sent-notice"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-success/10 text-success border border-success/30',
          )}
        >
          {t(
            'forgotPassword.sentNotice',
            {},
            { defaultValue: 'If that address has an account, a reset link is on its way.' },
          )}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
          aria-label={t(
            'forgotPassword.formLabel',
            {},
            { defaultValue: 'Request reset link form' },
          )}
        >
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
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              data-mol-id="forgot-email"
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

          {error ? (
            <p
              data-mol-id="forgot-error"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error/10 text-error border border-error/30',
              )}
            >
              {error.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSending}
            data-mol-id="forgot-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
              'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
            )}
          >
            {isSending
              ? t('forgotPassword.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </SwitchboardAuthShell>
  )
}
