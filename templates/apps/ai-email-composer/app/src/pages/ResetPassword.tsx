import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthInputField } from '../components/AuthInputField.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Error is tracked in hook state via confirmReset; no additional handling needed
    }
  }

  return (
    <AuthShell
      subtitle={t(
        'resetPassword.tagline',
        {},
        { defaultValue: 'Pick a new password and you’ll be back composing in seconds.' },
      )}
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
        <AuthInputField
          id="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          icon="lock"
          label={t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
          placeholder={t(
            'common.atLeast8Characters',
            {},
            { defaultValue: 'At least 8 characters' },
          )}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          }
        />
        <AuthInputField
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          icon="lock_reset"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          placeholder={t(
            'resetPassword.confirmPasswordPlaceholder',
            {},
            { defaultValue: 'Re-type your password' },
          )}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {(mismatch || confirmError) && (
          <div
            data-mol-id="reset-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {mismatch
              ? t(
                  'resetPassword.mismatch',
                  {},
                  { defaultValue: 'Passwords do not match — please re-enter both.' },
                )
              : confirmError?.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 4),
            cm.roundedFull,
            cm.textSize('base'),
            cm.fontWeight('bold'),
            'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 28%, transparent)',
          }}
        >
          {isSubmitting
            ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>

      <Link
        to="/login"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.textCenter,
          'text-on-surface-variant hover:text-primary',
        )}
      >
        {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
      </Link>
    </AuthShell>
  )
}

export default ResetPassword
export { ResetPassword as ResetPasswordPage }
