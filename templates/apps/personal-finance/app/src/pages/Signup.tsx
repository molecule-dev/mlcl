import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import LoginBrandingHeader from '../components/LoginBrandingHeader.js'
import LoginGlobalFooter from '../components/LoginGlobalFooter.js'
import SocialLoginButtons from '../components/SocialLoginButtons.js'

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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ email, password })
      clearAuthForm()
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Sign up failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl tonal-sculpting',
          )}
        >
          <LoginBrandingHeader />
          <form
            className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
            onSubmit={handleSubmit}
            data-mol-id="signup-form"
          >
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                data-mol-id="signup-error"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'rounded-lg bg-error-container text-on-error-container',
                )}
              >
                {error}
              </div>
            )}
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
                {t('signup.emailLabel', {}, { defaultValue: 'Email Address' })}
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
                  placeholder={t(
                    'signup.emailPlaceholder',
                    {},
                    { defaultValue: 'curator@ledger.com' },
                  )}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 1))}
              >
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
              </div>
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
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  aria-label={
                    showPassword
                      ? t('common.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('common.showPassword', {}, { defaultValue: 'Show password' })
                  }
                  className={cm.cn(
                    cm.sp('ml', 2),
                    'text-outline hover:text-primary transition-colors',
                  )}
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <button
              className={cm.cn(
                cm.sp('py', 4),
                cm.roundedFull,
                cm.textSize('lg'),
                cm.sp('mt', 4),
                cm.fontWeight('bold'),
                'primary-gradient text-white font-headline hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all',
              )}
              type="submit"
              disabled={loading}
              data-mol-id="signup-submit"
            >
              {loading
                ? t('signup.submitting', {}, { defaultValue: 'Creating Account…' })
                : t('signup.createAccount', {}, { defaultValue: 'Create Account' })}
            </button>
          </form>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('py', 2),
              'relative',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'absolute inset-0')}>
              <div className={cm.cn(cm.w('full'), 'bg-surface-container h-[1px]')}></div>
            </div>
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'relative bg-surface-container-lowest text-outline uppercase tracking-widest',
              )}
            >
              {t('signup.orContinueWith', {}, { defaultValue: 'or continue with' })}
            </span>
          </div>
          <SocialLoginButtons />
        </div>
        <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              className={cm.cn(
                'text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1',
              )}
              to="/login"
              data-mol-id="signup-login-link"
            >
              {t('signup.logIn', {}, { defaultValue: 'Log In' })}
            </Link>
          </p>
        </footer>
      </main>
      <LoginGlobalFooter />
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
