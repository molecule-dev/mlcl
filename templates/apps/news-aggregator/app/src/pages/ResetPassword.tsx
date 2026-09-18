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
  const [showPassword, setShowPassword] = useState(false)

  const isResetting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/home', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — no further action needed here
    }
  }

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
              'bg-surface-container-lowest rounded-xl tonal-sculpting',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.textCenter}>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'font-headline text-on-surface',
                )}
              >
                {t(
                  'auth.resetPassword.chooseNewPassword',
                  {},
                  { defaultValue: 'Choose a new password' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'auth.resetPassword.enterNewPasswordBelow',
                  {},
                  { defaultValue: 'Enter your new password below to regain access.' },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="email"
                >
                  {t('resetPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-outline',
                    )}
                  >
                    mail
                  </span>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                    )}
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t(
                      'auth.passwordPlaceholderNameExample',
                      {},
                      { defaultValue: 'name@example.com' },
                    )}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="token"
                >
                  {t('resetPassword.tokenLabel', {}, { defaultValue: 'Reset Token' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-outline',
                    )}
                  >
                    vpn_key
                  </span>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                    )}
                    id="token"
                    type="text"
                    required
                    placeholder={t(
                      'auth.resetPassword.fromTheEmailWeSent',
                      {},
                      { defaultValue: 'From the email we sent' },
                    )}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="password"
                >
                  {t(
                    'settings.changePasswordModal.newPassword',
                    {},
                    { defaultValue: 'New Password' },
                  )}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-outline',
                    )}
                  >
                    lock
                  </span>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                    )}
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
                      'text-outline hover:text-primary transition-colors',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {confirmError && (
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
                  {confirmError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isResetting}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'text-white font-headline hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-to))',
                }}
              >
                {isResetting
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              <Link
                to="/login"
                className={'font-bold hover:underline decoration-2 underline-offset-4'}
                style={{ color: 'var(--mol-color-primary-dark)' }}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
              <span className={'mx-3 text-on-surface-variant/40'}>|</span>
              <Link
                to="/forgot-password"
                className={'font-bold hover:underline decoration-2 underline-offset-4'}
                style={{ color: 'var(--mol-color-primary-dark)' }}
              >
                {t('common.requestANewLink', {}, { defaultValue: 'Request a new link' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
