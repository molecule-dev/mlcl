import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  const urlEmail = searchParams.get('email') ?? undefined
  // Cross-view auth form persistence — the reset link's ?email= seeds it and
  // wins; the email also carries from the Forgot/Login views. Cleared on success.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatchError, setMismatchError] = useState('')

  const isResetting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMismatchError('')
    if (password !== confirm) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/c', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'Reset access' })}
      heading={t('resetPassword.heading', {}, { defaultValue: 'Set a new password.' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Pick something you can remember; we never store it in plaintext.' },
      )}
      footer={
        <Link to="/login" className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}>
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-email"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t(
              'resetPassword.emailPlaceholder',
              {},
              { defaultValue: 'you@stoa.community' },
            )}
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-token"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
          </label>
          <input
            id="reset-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder={t(
              'resetPassword.tokenPlaceholder',
              {},
              { defaultValue: 'Pasted from your email' },
            )}
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base font-mono tracking-widest',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-password"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          </label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-confirm"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          </label>
          <input
            id="reset-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
            )}
          />
        </div>
        {(mismatchError || confirmError) && (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {mismatchError || confirmError?.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isResetting}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'inline-flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 disabled:opacity-60',
          )}
        >
          {isResetting ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined text-base animate-spin')}
                aria-hidden
              >
                progress_activity
              </span>
              {t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })}
            </>
          ) : (
            <>
              {t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                lock_reset
              </span>
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
