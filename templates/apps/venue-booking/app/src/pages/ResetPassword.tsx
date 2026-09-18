import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AlcoveAuthShell } from '../components/AlcoveAuthShell.js'
import { loadContent } from '../config.js'

/**
 * ResetPassword page — wraps AlcoveAuthShell. Per screen-map.json
 * derivation: New Password and Confirm Password fields, heading
 * "Set a new password", button "Reset password", bottom link
 * "Back to Sign In", no email or OAuth.
 *
 * Translated from hotel-booking's ResetPassword.tsx.
 */
export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const tokenFromUrl = searchParams.get('token') ?? ''
  const emailFromUrl = searchParams.get('email') ?? ''
  const [token] = useState(tokenFromUrl)
  const [email] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const isLoggingIn = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      if (email) await login({ email, password })
      navigate('/', { replace: true })
    } catch (_error) {
      // Error state is tracked inside the confirmReset/login hooks — no action needed here.
    }
  }

  return (
    <AlcoveAuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        { appName: APP_NAME },
        {
          defaultValue:
            'Choose a new password for your {{appName}} account. Use at least 8 characters; we recommend a passphrase.',
        },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'text-primary font-bold hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_back
          </span>
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>

        {mismatch ? (
          <p
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {t(
              'auth.signup.passwordsDontMatchPeriod',
              {},
              { defaultValue: "Passwords don't match." },
            )}
          </p>
        ) : null}
        {confirmError ? (
          <p
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {confirmError.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>

      <div
        className={cm.cn(
          cm.sp('mt', 6),
          cm.flex({ align: 'center', justify: 'center', wrap: 'wrap', gap: 'sm' }),
          cm.textSize('xs'),
          'text-on-surface-variant',
        )}
      >
        <span>{t('auth.legalAgree', {}, { defaultValue: 'By continuing, you agree to our' })}</span>
        <LegalModalLinks
          linkClassName={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          appName={APP_NAME}
          loadContent={loadContent}
        />
      </div>
    </AlcoveAuthShell>
  )
}
