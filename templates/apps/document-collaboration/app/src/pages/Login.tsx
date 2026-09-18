import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { QuillonAuthBrandPanel } from '../components/QuillonAuthBrandPanel.js'

export function Login() {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
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
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <QuillonAuthBrandPanel />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
          cm.sp('py', 12),
          'w-full lg:w-1/2',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-secondary',
              )}
            >
              {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'login.heading',
                { appName: APP_NAME },
                { defaultValue: 'Sign in to {{appName}}' },
              )}
            </h1>
            <p
              className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), 'italic text-on-surface-variant')}
              style={{ fontFamily: 'Charter, Georgia, serif' }}
            >
              {t('login.subtitle', {}, { defaultValue: 'Pick up where the cursor left off.' })}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8), 'space-y-5')}>
            <Field
              id="email"
              type="email"
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'writer@studio.com' })}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              id="password"
              type="password"
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              placeholder={t(
                'login.passwordPlaceholder',
                {},
                { defaultValue: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' },
              )}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />

            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <label
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                <input
                  type="checkbox"
                  className={cm.cn(
                    'h-4 w-4 rounded border-outline text-primary focus:ring-primary/40',
                  )}
                />
                {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
              </label>
              <Link
                to="/forgot-password"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline',
                )}
              >
                {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
              </Link>
            </div>

            {error ? (
              <p
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-error/10 text-error',
                )}
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('extrabold'),
                'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0',
              )}
            >
              {loading
                ? t('login.submitting', {}, { defaultValue: 'Signing in\u2026' })
                : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </button>
          </form>

          <div className={cm.cn(cm.sp('mt', 8))}>
            <OAuthButtons />
          </div>

          <p className={cm.cn(cm.sp('mt', 8), 'text-center text-sm text-on-surface-variant')}>
            {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
            <Link
              to="/signup"
              className={cm.cn(cm.fontWeight('extrabold'), 'text-primary hover:underline')}
            >
              {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

interface FieldProps {
  id: string
  type: 'email' | 'password' | 'text'
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
}

export function Field({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('extrabold'),
          'block uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={cm.cn(
          cm.w('full'),
          cm.sp('mt', 2),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          'rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        )}
      />
    </div>
  )
}

export default Login
