import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, #6366f1)`

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional handling needed here
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative bg-background text-on-surface overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'fixed top-0 right-0 -z-10 w-1/3 h-1/3 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none',
        )}
        style={{ background: `${BRAND_COLOR}1f` }}
      />
      <div
        className={cm.cn(
          'fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none',
        )}
        style={{ background: 'var(--color-secondary)' }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
            )}
          >
            <AuthBrandHeader />

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    'block text-[0.6875rem] font-bold mb-2 text-on-surface-variant tracking-[0.05em]',
                  )}
                  htmlFor="name"
                >
                  {t('signup.nameLabel', {}, { defaultValue: 'NAME' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[0.6875rem] font-bold mb-2 text-on-surface-variant tracking-[0.05em]',
                  )}
                  htmlFor="email"
                >
                  {t('signup.emailLabel', {}, { defaultValue: 'EMAIL' })}
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
                    'signup.emailPlaceholder',
                    {},
                    { defaultValue: 'ops@filament.io' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label
                  className={cm.cn(
                    'block text-[0.6875rem] font-bold mb-2 text-on-surface-variant tracking-[0.05em]',
                  )}
                  htmlFor="password"
                >
                  {t('signup.passwordLabel', {}, { defaultValue: 'PASSWORD' })}
                </label>
                <div className={cm.cn('relative')}>
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
                        ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className={cm.cn(
                      'absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div
                  data-mol-id="signup-error"
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-container text-on-error-container rounded-xl',
                  )}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('base'),
                  'rounded-xl text-white font-bold hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {isSigningUp
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('signup.submit', {}, { defaultValue: 'Create Account' })}
              </button>
            </form>

            <OAuthButtons />
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p className={cm.cn(cm.textSize('sm'), 'font-medium text-on-surface-variant')}>
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 ml-1')}
                style={{ color: BRAND_COLOR }}
              >
                {t('signup.signIn', {}, { defaultValue: 'Sign In' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
