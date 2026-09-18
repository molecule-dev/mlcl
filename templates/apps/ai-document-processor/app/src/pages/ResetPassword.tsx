import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

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

  const [token] = useState(searchParams.get('token') || '')
  const [email] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const submitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPwd) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      if (email) await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional handling needed here
    }
  }

  const inputWrap = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 4),
    'relative bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
  )
  const inputCls = cm.cn(
    cm.w('full'),
    cm.fontWeight('medium'),
    'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
  )
  const labelCls = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    cm.sp('ml', 1),
    'uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <AuthShell
      title={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subtitle={t(
        'resetPassword.subtitle',
        {},
        { defaultValue: 'Choose something at least 8 characters long.' },
      )}
      footerPrompt={
        <Link to="/login" className={cm.cn('font-bold hover:underline text-primary')}>
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label htmlFor="password" className={labelCls} style={{ fontSize: 10 }}>
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <div className={inputWrap}>
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('ml-2 text-on-surface-variant hover:text-primary transition-colors')}
            >
              <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 20 }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label htmlFor="confirm-password" className={labelCls} style={{ fontSize: 10 }}>
            {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          </label>
          <div className={inputWrap}>
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              lock_reset
            </span>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: 'Repeat the new password' },
              )}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {mismatch || confirmError ? (
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
                  'auth.signup.passwordsDoNotMatchPeriod',
                  {},
                  { defaultValue: 'Passwords do not match.' },
                )
              : confirmError?.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-full text-on-primary hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}
