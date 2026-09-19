import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, #14b8a6)`

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const strength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    return score
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      if (email) await login({ email, password })
      navigate('/tree', { replace: true })
    } catch (_error) {
      // error is captured in hook state (confirmError) — no further handling needed
    }
  }

  if (!token) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.minH('screen'),
          'bg-surface-container-low font-body text-on-surface relative',
        )}
      >
        <main
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.flex1,
            cm.sp('p', 6),
          )}
        >
          <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'lg' }),
                cm.sp('p', 10),
                cm.textCenter,
                'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
              )}
            >
              <AuthBrandHeader />
              <p className={cm.cn(cm.textSize('base'), 'text-on-surface')}>
                {t(
                  'resetPassword.invalidLink',
                  {},
                  { defaultValue: 'This password reset link is invalid or has expired.' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ justify: 'center', gap: 'lg' }), cm.textSize('sm'))}>
                <Link
                  to="/login"
                  className={cm.cn('font-bold hover:underline')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
                <Link
                  to="/forgot-password"
                  className={cm.cn('font-bold hover:underline')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('common.requestANewLink', {}, { defaultValue: 'Request a new link' })}
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface relative',
      )}
    >
      <div
        className={cm.cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none')}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute top-[-10%] right-[-10%] bg-primary/10 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute bottom-[-10%] left-[-10%] bg-secondary/10 blur-[120px]',
          )}
        />
      </div>

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
            )}
          >
            <AuthBrandHeader />

            <div>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  cm.textCenter,
                  cm.sp('mb', 1),
                )}
              >
                {t(
                  'auth.resetPassword.setNewPasswordShort',
                  {},
                  { defaultValue: 'Set new password' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}>
                {t(
                  'resetPassword.subtitle',
                  {},
                  { defaultValue: 'Choose a strong password to protect your tree.' },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em]',
                  )}
                  htmlFor="password"
                >
                  {t('resetPassword.passwordLabel', {}, { defaultValue: 'NEW PASSWORD' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password && (
                  <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 2))}>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={cm.cn('h-1 flex-1 rounded-full')}
                        style={{
                          backgroundColor:
                            i < strength
                              ? strength >= 3
                                ? 'var(--color-clinical-normal)'
                                : strength === 2
                                  ? 'var(--color-clinical-caution)'
                                  : 'var(--color-clinical-abnormal)'
                              : 'var(--color-outline-variant)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em]',
                  )}
                  htmlFor="confirm"
                >
                  {t('resetPassword.confirmLabel', {}, { defaultValue: 'CONFIRM NEW PASSWORD' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {(mismatch || confirmError) && (
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
                        'auth.signup.passwordsDoNotMatchPeriod',
                        {},
                        { defaultValue: 'Passwords do not match.' },
                      )
                    : confirmError?.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {isSubmitting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              </button>
            </form>
          </div>

          <footer
            className={cm.cn(
              cm.sp('mt', 12),
              cm.flex({ direction: 'col', align: 'center' }),
              'gap-4',
            )}
          >
            <span
              className={cm.cn(
                'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest',
              )}
            >
              {t(
                'resetPasswordFooter.trust',
                {},
                { defaultValue: 'Your family history, kept private' },
              )}
            </span>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4')}
                style={{ color: BRAND_COLOR }}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
