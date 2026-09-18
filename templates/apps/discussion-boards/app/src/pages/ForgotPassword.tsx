import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

  const isSending = requestStatus === 'pending'
  const isSent = requestStatus === 'resolved'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Reset access' })}
      heading={t('forgotPassword.heading', {}, { defaultValue: 'Reset your password.' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter the email on your account and we will send a reset link.' },
      )}
      footer={
        <Link to="/login" className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}>
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      {isSent ? (
        <div className={cm.cn(cm.stack(3), cm.textCenter)}>
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'bg-success-light text-success mx-auto',
            )}
            aria-hidden
          >
            <span className={cm.cn('material-symbols-outlined text-xl')}>mark_email_read</span>
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('forgotPassword.checkInbox', {}, { defaultValue: 'Check your inbox.' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgotPassword.sentBody',
              { email },
              {
                defaultValue:
                  'If an account exists for {{email}}, a reset link is on its way. Links expire in 30 minutes.',
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.stack(4)}>
          <div className={cm.stack(2)}>
            <label
              htmlFor="forgot-email"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder={t(
                'forgotPassword.emailPlaceholder',
                {},
                { defaultValue: 'you@stoa.community' },
              )}
              className={cm.cn(
                cm.sp('p', 3),
                'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
              )}
            />
          </div>
          {requestError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{requestError.message}</p>
          )}
          <button
            type="submit"
            disabled={isSending}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'inline-flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 disabled:opacity-60',
            )}
          >
            {isSending ? (
              <>
                <span
                  className={cm.cn('material-symbols-outlined text-base animate-spin')}
                  aria-hidden
                >
                  progress_activity
                </span>
                {t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })}
              </>
            ) : (
              <>
                {t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                  send
                </span>
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
