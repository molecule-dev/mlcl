import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ name, email, password })
      clearAuthForm()
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.genericError', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 4),
        cm.minH('screen'),
        cm.surfaceSecondary,
      )}
    >
      {/* Auth Card */}
      <main
        className={cm.cn(
          cm.w('full'),
          cm.maxW('[420px]'),
          cm.stack(8),
          'bg-surface rounded-lg shadow-ambient px-[48px] py-[44px]',
        )}
      >
        {/* Header */}
        <header className={cm.textCenter}>
          <h1
            className={cm.cn(
              cm.sp('mb', 1),
              'text-[28px] font-[900] text-[var(--mol-color-secondary)] leading-tight tracking-tight',
            )}
          >
            {t('signup.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <h2
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mb', 1),
              'text-[22px] text-[var(--mol-color-secondary)]',
            )}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-status-refunded')}>
            {t('signup.subtitle', {}, { defaultValue: 'Sign up to get started' })}
          </p>
        </header>
        {/* Form */}
        <form className={cm.stack(4)} onSubmit={handleSubmit}>
          {error && (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textCenter,
                'bg-error-light text-error rounded-[8px] text-[14px]',
              )}
              role="alert"
            >
              {error}
            </div>
          )}
          {/* Name Input */}
          <div className={cm.flex({ direction: 'col' })}>
            <label
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-[14px] text-[var(--color-label-text)] mb-1.5',
              )}
              htmlFor="name"
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              className={cm.cn(
                cm.sp('px', 3),
                cm.h('[44px]'),
                'bg-surface-secondary border-[var(--color-star-empty)] border rounded-[8px] text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-price-original',
              )}
              data-mol-id="signup-name-input"
              id="name"
              name="name"
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
              required={true}
              type="text"
              value={name}
            />
          </div>
          {/* Email Input */}
          <div className={cm.flex({ direction: 'col' })}>
            <label
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-[14px] text-[var(--color-label-text)] mb-1.5',
              )}
              htmlFor="email"
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              className={cm.cn(
                cm.sp('px', 3),
                cm.h('[44px]'),
                'bg-surface-secondary border-[var(--color-star-empty)] border rounded-[8px] text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-price-original',
              )}
              data-mol-id="signup-email-input"
              id="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              required={true}
              type="email"
              value={email}
            />
          </div>
          {/* Password Input */}
          <div className={cm.flex({ direction: 'col' })}>
            <label
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-[14px] text-[var(--color-label-text)] mb-1.5',
              )}
              htmlFor="password"
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <input
              className={cm.cn(
                cm.sp('px', 3),
                cm.h('[44px]'),
                'bg-surface-secondary border-[var(--color-star-empty)] border rounded-[8px] text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-price-original',
              )}
              data-mol-id="signup-password-input"
              id="password"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              required={true}
              type="password"
              value={password}
            />
          </div>
          {/* Submit Button */}
          <div className={cm.sp('pt', 2)}>
            <button
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.h('[44px]'),
                'bg-primary text-white text-[15px] rounded-[8px] hover:bg-primary-hover active:scale-[0.98] transition-all',
              )}
              data-mol-id="signup-submit-button"
              disabled={loading}
              type="submit"
            >
              {loading
                ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </button>
          </div>
        </form>
        <OAuthButtons />
        {/* Footer Link */}
        <footer className={cm.textCenter}>
          <p className={cm.cn(cm.textSize('sm'), 'text-status-refunded')}>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              className={cm.cn(
                'text-in-stock font-semibold hover:text-primary-dark transition-colors',
              )}
              data-mol-id="signup-signin-link"
              to="/login"
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
