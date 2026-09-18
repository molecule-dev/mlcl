import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function LoginForm() {
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
      navigate('/admin/dashboard')
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
    <>
      {/* Login Form */}
      <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
        {error && (
          <div
            data-mol-id="login-error"
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {error}
          </div>
        )}
        <div className={cm.cn(cm.stack(2))}>
          <label
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 4),
              'block font-label text-on-surface-variant',
            )}
          >
            {t('login.emailLabel', {}, { defaultValue: 'Email Address' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'ghost-border bg-surface-container-low rounded-xl transition-all',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-outline')}
              data-icon="alternate_email"
            >
              alternate_email
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
              )}
              placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'name@luxury.com' })}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className={cm.cn(cm.stack(2))}>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('px', 4))}>
            <label
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'block font-label text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              className={cm.cn('text-secondary font-semibold text-sm hover:underline')}
              to="/forgot-password"
            >
              {t('login.forgot', {}, { defaultValue: 'Forgot Password?' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'ghost-border bg-surface-container-low rounded-xl transition-all',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-outline')} data-icon="lock">
              lock
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
              )}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.h(16),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all',
          )}
          type="submit"
          disabled={loading}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('login.submit', {}, { defaultValue: 'Sign In' })}
          <span className={cm.cn('material-symbols-outlined')} data-icon="arrow_forward">
            arrow_forward
          </span>
        </button>
      </form>
    </>
  )
}

export default LoginForm
