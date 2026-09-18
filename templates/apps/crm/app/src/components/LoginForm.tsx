import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
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
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.error.loginFailed', {}, { defaultValue: 'Login failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cm.stack(8)} onSubmit={handleSubmit}>
      <div className={cm.stack(6)}>
        {/* Email Field */}
        <div className={cm.fvdef3facc}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              cm.sp('px', 1),
              'block text-[10px] uppercase tracking-[0.05em] text-on-surface-variant',
            )}
            htmlFor="email"
          >
            {t('login.emailLabel', {}, { defaultValue: 'Email Address' })}
          </label>
          <div className={cm.fvd683bc2b}>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 4),
                cm.textSize('sm'),
                'bg-surface-container-lowest ghost-border rounded-xl text-on-surface placeholder:text-outline/50 transition-all duration-300 focus:ring-0 focus:border-primary border-transparent outline-none ring-0 appearance-none',
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
            />
            <div className={cm.fv0a84f876}></div>
          </div>
        </div>
        {/* Password Field */}
        <div className={cm.fvdef3facc}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'end' }),
              cm.sp('mb', 2),
              cm.sp('px', 1),
            )}
          >
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-[0.05em] text-on-surface-variant',
              )}
              htmlFor="password"
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
          </div>
          <div className={cm.fvd683bc2b}>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 4),
                cm.textSize('sm'),
                'bg-surface-container-lowest ghost-border rounded-xl text-on-surface placeholder:text-outline/50 transition-all duration-300 focus:ring-0 focus:border-primary border-transparent outline-none ring-0 appearance-none',
              )}
              id="password"
              placeholder={t(
                'login.passwordPlaceholder',
                {},
                { defaultValue: 'Enter your password' },
              )}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className={cm.fv0a84f876}></div>
          </div>
          <div className={cm.cn(cm.sp('mt', 3), cm.textRight)}>
            <Link className={cm.fva6815f74} to="/forgot-password">
              {t('login.forgotPassword', {}, { defaultValue: 'Forgot Password?' })}
            </Link>
          </div>
        </div>
      </div>
      {/* Action Button */}
      {error && (
        <div
          data-mol-id="login-error"
          role="alert"
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--color-error-container)',
            color: 'var(--mol-color-error)',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}
      <button
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 4),
          cm.fontWeight('bold'),
          'architect-gradient text-white rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 active:scale-[0.98] tracking-tight',
        )}
        type="submit"
        disabled={loading}
      >
        {loading
          ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
          : t('login.submit', {}, { defaultValue: 'Sign In to Console' })}
      </button>
    </form>
  )
}

export default LoginForm
export { LoginForm }
