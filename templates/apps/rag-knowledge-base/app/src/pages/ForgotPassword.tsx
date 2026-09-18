import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_GRADIENT } from '../branding.js'
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

  const isSending = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // Error tracked in hook state via requestError — no action needed here
    }
  }

  if (submitted) {
    return (
      <AuthShell
        title={t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
        subtitle={t(
          'forgotPassword.sentSubtitle',
          { email },
          { defaultValue: `We sent a reset link to ${email}.` },
        )}
        footerPrompt={
          <Link
            to="/login"
            className={cm.cn(
              'font-bold hover:underline decoration-2 underline-offset-4 ml-1 text-primary',
            )}
          >
            {t('forgotPassword.backToSignIn', {}, { defaultValue: '\u2190 Back to Sign In' })}
          </Link>
        }
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('py', 6),
            cm.textCenter,
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(16),
              cm.h(16),
              cm.roundedFull,
              'bg-success/10',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 32, color: 'var(--color-success)' }}
              aria-hidden="true"
            >
              mark_email_read
            </span>
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xs')}>
            {t(
              'forgotPassword.sentBody',
              {},
              {
                defaultValue:
                  'If you don\u2019t see it, check your spam folder. The link expires in 30 minutes.',
              },
            )}
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subtitle={t(
        'forgotPassword.subtitle',
        {},
        { defaultValue: 'Enter your email to receive a reset link.' },
      )}
      footerPrompt={
        <Link
          to="/login"
          className={cm.cn(
            'font-bold hover:underline decoration-2 underline-offset-4 ml-1 text-primary',
          )}
        >
          {t('forgotPassword.backToSignIn', {}, { defaultValue: '\u2190 Back to Sign In' })}
        </Link>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            htmlFor="email"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            style={{ fontSize: 10 }}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t(
                'auth.passwordPlaceholderNameCompany',
                {},
                { defaultValue: 'name@company.com' },
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
              )}
            />
          </div>
        </div>

        {requestError ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {requestError.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSending}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-full text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20',
          )}
          style={{ background: BRAND_GRADIENT }}
        >
          {isSending
            ? t('forgotPassword.submitting', {}, { defaultValue: 'Sending\u2026' })
            : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
        </button>
      </form>
    </AuthShell>
  )
}
