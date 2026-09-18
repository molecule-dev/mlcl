import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DriftboardAuthShell } from '../components/DriftboardAuthShell.js'
import { DriftInput } from '../components/DriftInput.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
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
      // Error tracked in hook state (requestError from usePasswordReset)
    }
  }

  return (
    <DriftboardAuthShell
      eyebrow={t(
        'forgotPassword.eyebrow',
        { appName: APP_NAME },
        { defaultValue: '{{appName}} · Account recovery' },
      )}
      headline={t('forgotPassword.headline', {}, { defaultValue: 'Lost your password? Easy fix.' })}
      subline={t(
        'forgotPassword.subline',
        {},
        {
          defaultValue:
            "Enter your email and we'll send a one-time recovery link. Boards, members, and history stay exactly where you left them.",
        },
      )}
      formTitle={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      formSubtitle={t(
        'forgotPassword.formSubtitle',
        {},
        { defaultValue: "We'll email a recovery link that's good for the next hour." },
      )}
      footer={
        <p className="text-center text-on-surface-variant">
          {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(`font-bold text-primary hover:opacity-80 transition-opacity`)}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      {submitted ? (
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'start' }), cm.stack(4))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-emerald-500/10 text-success',
            )}
          >
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            {t('forgotPassword.sentLabel', {}, { defaultValue: 'Email sent' })}
          </span>
          <p className="text-on-surface">
            {t(
              'forgotPassword.success',
              { email },
              { defaultValue: 'Check your inbox at {{email}} for the recovery link.' },
            )}
          </p>
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl font-bold text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
            )}
          >
            {t('forgotPassword.continueCta', {}, { defaultValue: 'I have my reset code' })}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
          <DriftInput
            label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@company.com"
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
              ? t('forgotPassword.sending', {}, { defaultValue: 'Sending recovery link…' })
              : t('forgotPassword.submit', {}, { defaultValue: 'Send recovery link' })}
          </button>
          {requestError ? (
            <p className={cm.cn(`text-sm text-error font-semibold`)}>{requestError.message}</p>
          ) : null}
        </form>
      )}
    </DriftboardAuthShell>
  )
}

export default ForgotPassword
