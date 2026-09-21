import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SwitchboardAuthShell } from '../components/SwitchboardAuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    confirmStatus: status,
    confirmError: error,
    confirmReset: resetPassword,
  } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const token = searchParams.get('token') ?? ''
  const isResetting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await resetPassword({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      /* Error tracked in hook state */
    }
  }

  return (
    <SwitchboardAuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Choose a new password for your front desk account.' },
      )}
      footer={
        <Link
          to="/login"
          className={'-my-2 inline-block py-2 text-primary font-bold hover:underline'}
          data-mol-id="reset-back-link"
        >
          {t('forgotPassword.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        aria-label={t('resetPassword.formLabel', {}, { defaultValue: 'Set new password form' })}
      >
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            data-mol-id="reset-password"
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
            {t('auth.resetPassword.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            id="confirmPassword"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            data-mol-id="reset-confirm-password"
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
            data-mol-id="reset-mismatch"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {t('auth.signup.passwordMismatch', {}, { defaultValue: 'Passwords do not match' })}
          </p>
        ) : null}

        {error ? (
          <p
            data-mol-id="reset-error"
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
          disabled={isResetting || token === ''}
          data-mol-id="reset-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isResetting
            ? t('resetPassword.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('resetPassword.resetButton', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </SwitchboardAuthShell>
  )
}
