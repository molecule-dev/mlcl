import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LoginForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { login } = useAuth()
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.error', {}, { defaultValue: 'Invalid email or password.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
      {error && (
        <div
          data-mol-id="login-error"
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
          {t('login.email', {}, { defaultValue: 'Email Address' })}
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
          'indigo-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
        )}
        type="submit"
        disabled={loading}
      >
        {t('login.signIn', { appName: APP_NAME }, { defaultValue: 'Sign in to {{appName}}' })}

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

export default LoginForm
export { LoginForm }
