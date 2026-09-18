import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesAuthShell } from '../components/RushesAuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { confirmReset, confirmStatus, confirmError } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'
  const error = confirmError
    ? confirmError instanceof Error
      ? confirmError.message
      : String(confirmError)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      // error is tracked in hook state via confirmReset's own error handling
    }
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:ring-1 focus:ring-[var(--video-cta-from)]/40 focus:outline-none transition-colors placeholder:text-[var(--video-text-dim)]',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    'block font-mono uppercase tracking-widest text-[var(--video-text-muted-alt)] mb-1.5',
  )

  return (
    <RushesAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Choose something only you would remember.' },
      )}
      footer={
        <Link
          to="/login"
          className={
            'text-[var(--video-link)] hover:text-[var(--video-link-hover)] font-medium transition-colors'
          }
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="reset-password-form">
        <div>
          <label htmlFor="password" className={labelClass}>
            {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className={labelClass}>
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t('resetPassword.repeat', {}, { defaultValue: 'Repeat password' })}
            className={fieldClass}
          />
        </div>

        {mismatch && (
          <p
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-[var(--video-error-text)] font-mono')}
          >
            {t(
              'auth.signup.passwordsDoNotMatchPeriod',
              {},
              { defaultValue: 'Passwords do not match.' },
            )}
          </p>
        )}
        {!token && (
          <p
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-[var(--video-error-text)] font-mono')}
          >
            {t(
              'resetPassword.missingToken',
              {},
              { defaultValue: 'Reset token missing — request a new link.' },
            )}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !token}
          data-mol-id="reset-password-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg text-white bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] hover:from-[var(--video-cta-from-hover)] hover:to-[var(--video-cta-to-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span>
            {isSubmitting
              ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
              : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>lock_reset</span>
        </button>
      </form>
    </RushesAuthShell>
  )
}

export default ResetPassword
