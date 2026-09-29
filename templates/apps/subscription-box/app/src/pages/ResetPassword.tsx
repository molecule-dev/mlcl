import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success). The reset link's ?email= seeds it
  // and wins over any stored value; otherwise the email typed on Forgot
  // carries over.
  const urlEmail = searchParams.get('email') ?? undefined
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirmPassword) {
      setLocalError(
        t('resetPassword.passwordMismatch', {}, { defaultValue: 'Passwords need to match.' }),
      )
      return
    }
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // intentional noop: error is tracked in hook state and displayed via confirmError
    }
  }

  const displayError = localError || confirmError?.message

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute -left-32 -top-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-success/20 blur-3xl pointer-events-none',
        )}
      />

      <main className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-[2rem] shadow-xl border border-outline-variant/30',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.textCenter,
            )}
          >
            <h1>
              <BrandWordmark as="span" size="lg" />
            </h1>
            <p className={cm.cn('text-sm font-medium text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h2>
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'resetPassword.subtitle',
                {},
                { defaultValue: 'Pick something memorable. Eight characters minimum.' },
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {displayError && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'rounded-xl bg-error/10 text-error text-sm text-center',
                )}
              >
                {displayError}
              </div>
            )}
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
              </span>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-mono font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
              </span>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 focus-within:border-primary transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-base text-on-surface-variant mr-2',
                  )}
                >
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cm.cn(
                    'flex-1 py-3 bg-transparent border-none outline-none text-sm font-medium text-on-surface',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
                  aria-label={
                    showPassword
                      ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
                  }
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
                )}
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cm.cn(
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.roundedFull,
                cm.sp('mt', 2),
                'text-base text-on-primary bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60',
              )}
            >
              {isSubmitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
            </button>
          </form>
        </div>
        <footer className={cm.cn(cm.sp('mt', 6), cm.textCenter)}>
          <Link
            to="/login"
            className={cm.cn(
              'text-sm font-bold text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </footer>
      </main>
    </div>
  )
}

export default ResetPassword
