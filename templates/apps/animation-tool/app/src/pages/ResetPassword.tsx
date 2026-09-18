import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VivaceAuthShell } from '../components/VivaceAuthShell.js'

const INPUT_STYLE = {
  backgroundColor: 'var(--anim-background)',
  color: 'var(--anim-text)',
  border: '1px solid var(--anim-border)',
}

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { confirmReset, confirmStatus, confirmError } = usePasswordReset()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const loading = confirmStatus === 'pending'
  const apiError = confirmError
    ? confirmError instanceof Error
      ? confirmError.message
      : String(confirmError)
    : null
  const error = localError ?? apiError

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) {
      setLocalError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    try {
      await confirmReset({ token, password })
      navigate('/login')
    } catch (_error) {
      // surfaced via confirmError — the auth client sets its own error state
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg focus:outline-none transition-colors',
  )
  const labelClass = cm.cn(cm.textSize('xs'), 'block font-mono uppercase tracking-widest mb-1.5')

  return (
    <VivaceAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Make it something you will remember' },
      )}
      footer={
        <Link
          to="/login"
          className={'font-medium transition-colors'}
          style={{ color: 'var(--anim-primary)' }}
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="reset-form">
        <div>
          <label
            htmlFor="password"
            className={labelClass}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {t('resetPassword.newLabel', {}, { defaultValue: 'New password' })}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className={labelClass}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
            style={INPUT_STYLE}
          />
        </div>

        {error && (
          <p
            role="alert"
            data-mol-id="reset-error"
            className={cm.cn(cm.textSize('xs'), 'font-mono')}
            style={{ color: 'var(--anim-danger)' }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-mol-id="reset-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
            color: 'var(--color-on-primary)',
          }}
        >
          <span>
            {loading
              ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
              : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>lock_reset</span>
        </button>
      </form>
    </VivaceAuthShell>
  )
}

export default ResetPassword
