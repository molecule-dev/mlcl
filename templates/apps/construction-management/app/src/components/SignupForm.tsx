import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SignupForm() {
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
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.error', {}, { defaultValue: 'Could not create account. Please try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
      {error && (
        <div
          data-mol-id="signup-error"
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 3),
            cm.textSize('sm'),
            cm.textCenter,
            'bg-error-light text-error rounded-lg',
          )}
          role="alert"
        >
          {error}
        </div>
      )}
      {/* Name Field */}
      <div className={cm.cn(cm.stack(2))}>
        <label
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('ml', 1),
            'block tracking-wide text-on-background',
          )}
          htmlFor="name"
        >
          {t('form.name', {}, { defaultValue: 'Name' })}
        </label>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'bg-surface-container-low focus:bg-surface border-0 ghost-border rounded-xl text-on-background placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none',
            )}
            id="name"
            placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Your full name' })}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>
      {/* Email Field */}
      <div className={cm.cn(cm.stack(2))}>
        <label
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('ml', 1),
            'block tracking-wide text-on-background',
          )}
          htmlFor="email"
        >
          {t('signup.email', {}, { defaultValue: 'Email Address' })}
        </label>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'bg-surface-container-low focus:bg-surface border-0 ghost-border rounded-xl text-on-background placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none',
            )}
            id="email"
            placeholder={t(
              'auth.passwordPlaceholderNameCompany',
              {},
              { defaultValue: 'name@company.com' },
            )}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>
      {/* Password Field */}
      <div className={cm.cn(cm.stack(2))}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('ml', 1))}>
          <label
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'block tracking-wide text-on-background',
            )}
            htmlFor="password"
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <Link
            className={cm.cn('text-xs font-bold text-primary hover:opacity-80 transition-opacity')}
            to="/forgot-password"
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>
        <div className={cm.cn('relative')}>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'bg-surface-container-low focus:bg-surface border-0 ghost-border rounded-xl text-on-background placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none',
            )}
            id="password"
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>
      {/* Action Button */}
      <button
        className={cm.cn(
          cm.w('full'),
          cm.fontWeight('bold'),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          'brand-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        type="submit"
        disabled={loading}
      >
        {loading
          ? t('signup.loading', {}, { defaultValue: 'Creating account...' })
          : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
          data-icon="arrow_forward"
        >
          arrow_forward
        </span>
      </button>
    </form>
  )
}

export default SignupForm
export { SignupForm }
