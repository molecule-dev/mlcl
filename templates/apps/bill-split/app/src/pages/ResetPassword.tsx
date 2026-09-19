import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') ?? '')
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
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — ignoring here is correct
    }
  }

  return (
    <div
      data-mol-id="page-reset-password"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface rounded-3xl shadow-xl shadow-primary/5 border border-outline-variant/40',
            )}
          >
            <AuthBrandHeader />
            <div className={cm.textCenter}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant max-w-sm mx-auto',
                )}
              >
                {t(
                  'resetPassword.subheading',
                  {},
                  {
                    defaultValue:
                      'Paste the code from the email we just sent and choose a new password.',
                  },
                )}
              </p>
            </div>

            <form
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              onSubmit={handleSubmit}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="email"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-xl py-3 focus-within:ring-2 focus-within:ring-primary/30',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-xl text-on-surface-variant mr-2',
                    )}
                    aria-hidden="true"
                  >
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface',
                    )}
                  />
                </div>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="token"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-xl py-3 focus-within:ring-2 focus-within:ring-primary/30',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-xl text-on-surface-variant mr-2',
                    )}
                    aria-hidden="true"
                  >
                    pin
                  </span>
                  <input
                    id="token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface tracking-widest font-mono',
                    )}
                  />
                </div>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-xl py-3 focus-within:ring-2 focus-within:ring-primary/30',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-xl text-on-surface-variant mr-2',
                    )}
                    aria-hidden="true"
                  >
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface',
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
                    className={cm.cn(
                      'text-on-surface-variant hover:text-primary transition-colors ml-2',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="confirm"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-xl py-3 focus-within:ring-2 focus-within:ring-primary/30',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-xl text-on-surface-variant mr-2',
                    )}
                    aria-hidden="true"
                  >
                    lock_reset
                  </span>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface',
                    )}
                  />
                </div>
                {confirm && confirm !== password ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-[var(--color-status-rejected)]',
                    )}
                  >
                    {t(
                      'auth.signup.passwordsDoNotMatchPeriod',
                      {},
                      { defaultValue: 'Passwords do not match.' },
                    )}
                  </p>
                ) : null}
              </div>

              {confirmError ? (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'rounded-xl bg-error-container text-on-error-container',
                  )}
                >
                  {confirmError.message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || password !== confirm}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-full text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-60',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                }}
              >
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('resetPassword.submit', {}, { defaultValue: 'Reset password & sign in' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_back
              </span>
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
