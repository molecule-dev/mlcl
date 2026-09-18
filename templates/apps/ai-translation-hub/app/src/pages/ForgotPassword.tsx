import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
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
      // Error tracked in hook state (requestError is surfaced in the UI)
    }
  }

  return (
    <AuthShell>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 10),
          'rounded-[1.5rem] bg-surface-container-lowest border border-surface-container/50 shadow-2xl shadow-primary/10',
        )}
      >
        <AuthBrandHeader />
        <div className={cm.textCenter}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'tracking-tight')}>
            {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'forgot.subtitle',
              {},
              { defaultValue: 'We\u2019ll email you a link so you can choose a new one.' },
            )}
          </p>
        </div>

        {submitted ? (
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.textCenter,
              cm.flex({ direction: 'col', gap: 'sm' }),
              'rounded-2xl bg-tertiary-container text-on-tertiary-container',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-3xl mx-auto')}
              aria-hidden="true"
            >
              mail
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'forgot.sentBody',
                { email },
                { defaultValue: 'We sent reset instructions to {{email}}.' },
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
              <label
                htmlFor="email"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(
                  'forgot.emailPlaceholder',
                  {},
                  { defaultValue: 'you@workspace.com' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'h-12 bg-transparent border-0 border-b-2 border-surface-dim focus:border-primary focus:ring-0 focus:outline-none px-0 py-2 text-base placeholder:text-outline-variant transition-colors duration-300',
                )}
              />
            </div>

            {requestError && (
              <div
                role="alert"
                data-mol-id="forgot-error"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'rounded-xl bg-error-container text-on-error-container',
                )}
              >
                {requestError.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cm.cn(
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('mt', 2),
                'w-full rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-all shadow-md shadow-primary/30 disabled:opacity-60',
              )}
            >
              {isSubmitting
                ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            </button>
          </form>
        )}

        <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('forgot.backToLogin', {}, { defaultValue: '\u2190 Back to sign in' })}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default ForgotPassword
export { ForgotPassword as ForgotPasswordPage }
