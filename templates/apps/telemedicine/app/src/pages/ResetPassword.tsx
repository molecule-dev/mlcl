import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

const submitGradient = 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'

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

  const isLoggingIn = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background font-body text-on-surface',
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
              'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
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

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                  )}
                  htmlFor="email"
                >
                  {t('resetPassword.emailLabel', {}, { defaultValue: 'EMAIL' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t(
                    'resetPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'patient@solace.health' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                  )}
                  htmlFor="token"
                >
                  {t('resetPassword.tokenLabel', {}, { defaultValue: 'RESET TOKEN' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
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

              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                  )}
                  htmlFor="password"
                >
                  {t('resetPassword.passwordLabel', {}, { defaultValue: 'NEW PASSWORD' })}
                </label>
                <div className="relative">
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 5),
                      cm.textSize('sm'),
                      'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all pr-12',
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
                    className={
                      'absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors'
                    }
                  >
                    <span className="material-symbols-outlined">
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
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-xl text-on-primary font-headline hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {isLoggingIn
                  ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                  : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
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
            <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-2')}>
              <LegalModalLinks
                linkClassName={
                  'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest hover:text-primary transition-colors'
                }
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              />
              <span className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest">
                {t('resetFooter.hipaa', {}, { defaultValue: 'HIPAA Compliant' })}
              </span>
            </div>
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
                style={{ color: 'var(--color-primary)' }}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
              <span className={'mx-3 text-on-surface-variant/40'}>|</span>
              <Link
                to="/forgot-password"
                className={'font-bold hover:underline decoration-2 underline-offset-4'}
                style={{ color: 'var(--color-primary)' }}
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
