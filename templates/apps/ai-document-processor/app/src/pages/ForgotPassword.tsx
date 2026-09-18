import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

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
      // Error tracked in hook state; no additional handling needed here
    }
  }

  if (submitted) {
    return (
      <AuthShell
        title={t('forgotPassword.checkEmail', {}, { defaultValue: 'Check your email' })}
        subtitle={t(
          'common.weSentAPasswordResetLink',
          { email },
          { defaultValue: 'We sent a password reset link to {{email}}.' },
        )}
        footerPrompt={
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={cm.cn('font-bold hover:underline text-primary')}
          >
            {t('forgotPassword.backToSignIn', {}, { defaultValue: '← Back to sign in' })}
          </button>
        }
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.textCenter,
          )}
        >
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              'rounded-full flex items-center justify-center text-on-primary shadow-md shadow-primary/30',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              mark_email_read
            </span>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xs')}>
            {t(
              'forgotPassword.tip',
              {},
              { defaultValue: "Didn't get it? Check spam or try a different address." },
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
        'auth.forgotPassword.enterEmailDescription',
        {},
        { defaultValue: 'Enter your email and we will send you a reset link.' },
      )}
      footerPrompt={
        <>
          {t(
            'auth.login.rememberedYourPassword',
            {},
            { defaultValue: 'Remembered your password?' },
          )}{' '}
          <Link
            to="/login"
            className={cm.cn(
              'font-bold hover:underline decoration-2 underline-offset-4 ml-1 text-primary',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
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
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
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
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
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
            data-mol-id="forgot-error"
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
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-full text-on-primary hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          {isSubmitting
            ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
            : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
        </button>
      </form>
    </AuthShell>
  )
}
