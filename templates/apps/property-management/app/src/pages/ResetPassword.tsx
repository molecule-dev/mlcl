import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

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
  const error = confirmError

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
      // error tracked in hook state via resetError
    }
  }

  const inputShell = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 4),
    'bg-surface-container-low rounded-xl py-3.5 focus-within:ring-2 focus-within:ring-primary/30',
  )
  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('p', 0),
    cm.fontWeight('medium'),
    'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant/60',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface',
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
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/5',
            )}
          >
            <AuthBrandHeader />

            <header className={cm.textCenter}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'resetPassword.subheading',
                  {},
                  { defaultValue: 'Choose a strong password you don\u2019t use anywhere else.' },
                )}
              </p>
            </header>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                <label
                  htmlFor="password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
                </label>
                <div className={inputShell}>
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-on-surface-variant',
                    )}
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
                    className={inputClass}
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
                      cm.sp('ml', 2),
                      'text-on-surface-variant hover:text-primary transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                      aria-hidden="true"
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                <label
                  htmlFor="confirmPassword"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'auth.signup.confirmNewPassword',
                    {},
                    { defaultValue: 'Confirm new password' },
                  )}
                </label>
                <div className={inputShell}>
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    lock
                  </span>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder={t(
                      'resetPassword.confirmPasswordPlaceholder',
                      {},
                      { defaultValue: 'Repeat password' },
                    )}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {(error || mismatch) && (
                <div
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
                        { defaultValue: 'Passwords don\u2019t match.' },
                      )
                    : error?.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'text-on-primary hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-primary-light))',
                }}
              >
                {isSubmitting
                  ? t('resetPassword.submitting', {}, { defaultValue: 'Resetting\u2026' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-primary hover:underline',
              )}
            >
              {t('resetPassword.backToLogin', {}, { defaultValue: '\u2190 Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
