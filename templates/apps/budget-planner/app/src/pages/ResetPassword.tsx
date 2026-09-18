import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthSplitLayout } from '../components/AuthSplitLayout.js'
import { AuthField } from './Login.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { confirmReset, confirmStatus, confirmError } = usePasswordReset()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const loading = confirmStatus === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) {
      setLocalError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    if (!token) {
      setLocalError(
        t(
          'resetPassword.missingToken',
          {},
          { defaultValue: 'Reset link is missing or expired. Request a new one.' },
        ),
      )
      return
    }
    try {
      await confirmReset({ token, password })
      navigate('/login')
    } catch (_error) {
      // surfaced via confirmError from the usePasswordReset hook
    }
  }

  const errorMsg = localError ?? (confirmError instanceof Error ? confirmError.message : null)

  return (
    <AuthSplitLayout
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Your new password must be at least 8 characters.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), cm.textPrimary, 'hover:underline')}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        {errorMsg ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/20',
            )}
          >
            {errorMsg}
          </div>
        ) : null}

        <AuthField
          id="password"
          label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          icon="lock"
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
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          }
        >
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <AuthField
          id="confirm"
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          icon="lock"
        >
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t(
              'resetPassword.confirmPlaceholder',
              {},
              { defaultValue: 'Repeat your new password' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('base'),
            'rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md',
          )}
        >
          {loading
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthSplitLayout>
  )
}
