import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.error', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-mol-id="page-signup"
      aria-label={t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface antialiased',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative overflow-hidden',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            cm.roundedFull,
            'absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-surface-container blur-3xl opacity-50 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <div
          aria-hidden="true"
          className={cm.cn(
            cm.roundedFull,
            'absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-surface-variant blur-3xl opacity-30 mix-blend-multiply pointer-events-none',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.sp('p', 10),
            cm.w('full'),
            cm.maxW('[420px]'),
            'bg-surface-container-lowest rounded-xl relative z-10',
          )}
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-[2.75rem] text-primary tracking-tight leading-none font-headline',
              )}
            >
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {t('signup.subtitle', {}, { defaultValue: 'Create your support console account' })}
            </p>
          </div>
          <form className={cm.stack(6)} onSubmit={handleSubmit}>
            <div className={cm.stack(4)}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.sp('ml', 1),
                    'block text-[0.6875rem] uppercase tracking-widest text-on-surface mb-1.5',
                  )}
                  htmlFor="email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <div className="relative">
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pl', 3),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 left-0 pointer-events-none text-outline',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      mail
                    </span>
                  </span>
                  <input
                    data-mol-id="signup-email"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('pl', 10),
                      cm.sp('pr', 4),
                      cm.sp('py', 3),
                      'bg-surface-container-low border-transparent rounded-xl text-on-surface text-[0.875rem] focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-transparent transition-all duration-300',
                    )}
                    id="email"
                    name="email"
                    placeholder={t(
                      'signup.emailPlaceholder',
                      {},
                      { defaultValue: 'agent@rapport.io' },
                    )}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.sp('ml', 1),
                    'block text-[0.6875rem] uppercase tracking-widest text-on-surface mb-1.5',
                  )}
                  htmlFor="password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <div className="relative">
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pl', 3),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 left-0 pointer-events-none text-outline',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      lock
                    </span>
                  </span>
                  <input
                    data-mol-id="signup-password"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('pl', 10),
                      cm.sp('pr', 10),
                      cm.sp('py', 3),
                      'bg-surface-container-low border-transparent rounded-xl text-on-surface text-[0.875rem] focus:ring-2 focus:ring-primary/30 focus:bg-surface-container-lowest focus:border-transparent transition-all duration-300',
                    )}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    data-mol-id="signup-toggle-password"
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('pl', 3),
                      cm.sp('pr', 3),
                      'absolute inset-y-0 right-0 text-outline hover:text-on-surface transition-colors',
                    )}
                    type="button"
                    aria-label={t(
                      'signup.togglePassword',
                      {},
                      { defaultValue: 'Toggle password visibility' },
                    )}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <p
                data-mol-id="signup-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error')}
              >
                {error}
              </p>
            )}
            <div>
              <button
                data-mol-id="signup-submit"
                className={cm.cn(
                  cm.w('full'),
                  cm.flex({ justify: 'center' }),
                  cm.sp('px', 4),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'py-3.5 border border-transparent rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:scale-[1.02] transition-transform duration-300 ease-out shadow-[0_8px_16px_-4px_rgba(37,99,235,0.2)]',
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('signup.submit', {}, { defaultValue: 'Create Account' })}
              </button>
            </div>
          </form>
          <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.textSize('sm'))}>
            <span className="text-on-surface-variant">
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}
            </span>
            <Link
              data-mol-id="signup-login-link"
              className="font-medium text-primary hover:text-primary-container transition-colors ml-1"
              to="/login"
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
