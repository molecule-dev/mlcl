import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

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
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = confirmStatus === 'pending'
  const mismatch = confirm.length > 0 && confirm !== password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    try {
      await confirmReset({ token, password })
      // Auto-login is a best-effort convenience — only attempt it when the
      // user supplied an email. If it fails (or no email), drop them at
      // /login so they can sign in manually.
      if (email) {
        try {
          await login({ email, password })
          clearAuthForm()
          navigate('/dashboard', { replace: true })
          return
        } catch (_error) {
          // fall through to login redirect below
        }
      }
      navigate('/login', { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'Almost there' })}
      heading={t('resetPassword.heading', {}, { defaultValue: 'Set a fresh, secure password.' })}
      subtext={t(
        'resetPassword.subtext',
        {},
        {
          defaultValue:
            'Choose a strong password — at least 8 characters. We’ll log you in automatically once it’s saved.',
        },
      )}
      bottomLinkText={t('resetPassword.changedMind', {}, { defaultValue: 'Don’t need a reset?' })}
      bottomLinkLabel={t('resetPassword.signIn', {}, { defaultValue: 'Back to Sign in' })}
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('resetPassword.emailLabel', {}, { defaultValue: 'Email (optional)' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'resetPassword.emailPlaceholder',
                {},
                { defaultValue: 'you@example.com (auto-sign-in after reset)' },
              )}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </label>

        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              vpn_key
            </span>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t(
                'resetPassword.tokenPlaceholder',
                {},
                { defaultValue: 'Paste your code' },
              )}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-mono tabular-nums text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </label>

        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('text-on-surface-variant hover:text-on-surface')}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>

        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border',
              mismatch ? 'border-error' : 'border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              lock_reset
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: 'Re-enter password' },
              )}
              className={cm.cn(
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
          {mismatch ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}>
              {t('resetPassword.mismatch', {}, { defaultValue: 'Passwords don’t match.' })}
            </span>
          ) : null}
        </label>

        {confirmError ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'text-sm text-center rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {confirmError.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || mismatch}
          className={cm.cn(
            cm.sp('py', 3),
            'rounded-full text-base font-extrabold text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>

        {/* Trust chips (per the design): partner sync + reset hygiene */}
        <ul className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), 'pt-1')}>
          <li
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/40 border border-secondary/20',
            )}
          >
            <span className="material-symbols-outlined text-sm text-secondary" aria-hidden="true">
              sync_lock
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'font-bold text-secondary')}>
              {t('resetPassword.chipPartnerSync', {}, { defaultValue: 'Partner Sync' })}
            </span>
          </li>
          <li
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/40 border border-secondary/20',
            )}
          >
            <span className="material-symbols-outlined text-sm text-secondary" aria-hidden="true">
              timer
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'font-bold text-secondary')}>
              {t('resetPassword.chipSingleUse', {}, { defaultValue: 'Single-use reset code' })}
            </span>
          </li>
        </ul>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
