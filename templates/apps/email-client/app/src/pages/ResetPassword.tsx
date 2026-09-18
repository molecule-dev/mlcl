import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MeridianBrandHeader } from '../components/MeridianBrandHeader.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const isSubmitting = confirmStatus === 'pending'

  const mismatched = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mismatched) return
    try {
      await confirmReset({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-gradient-to-br from-primary/5 via-surface to-secondary/5 text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'lg' }),
              cm.sp('p', 10),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-2xl shadow-primary/10',
            )}
          >
            <MeridianBrandHeader />

            <header className={cm.cn(cm.textCenter, cm.flex({ direction: 'col', gap: 'xs' }))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'meridian.reset.subtitle',
                  {},
                  { defaultValue: 'Choose a strong password — at least 8 characters.' },
                )}
              </p>
            </header>

            <form
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              onSubmit={handleSubmit}
            >
              {/* New password */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('meridian.reset.newLabel', {}, { defaultValue: 'New password' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'h-12 rounded-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 2),
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
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(
                      'common.atLeast8Characters',
                      {},
                      { defaultValue: 'At least 8 characters' },
                    )}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60 text-on-surface',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('meridian.reset.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('meridian.reset.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className={cm.cn(
                      cm.sp('ml', 2),
                      'text-on-surface-variant hover:text-primary transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="confirm"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
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
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'h-12 rounded-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 2),
                      'material-symbols-outlined text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    verified_user
                  </span>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60 text-on-surface',
                    )}
                  />
                </div>
              </div>

              {mismatched && (
                <p role="alert" className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-error')}>
                  {t(
                    'auth.signup.passwordsDoNotMatchPeriod',
                    {},
                    { defaultValue: 'Passwords do not match.' },
                  )}
                </p>
              )}

              {confirmError && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'rounded-xl bg-error-light text-error',
                  )}
                >
                  {confirmError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || mismatched}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('base'),
                  cm.sp('mt', 2),
                  'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] transition-all disabled:opacity-60',
                )}
              >
                {isSubmitting
                  ? t('meridian.reset.submitting', {}, { defaultValue: 'Updating password…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-1 text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_back
              </span>
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
