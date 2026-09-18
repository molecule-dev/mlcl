import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await (
        auth as unknown as { login: (c: { email: string; password: string }) => Promise<void> }
      ).login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'login.failed',
              {},
              { defaultValue: 'Could not sign in. Check your email and password.' },
            ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'login.subheading',
        { appName: APP_NAME },
        { defaultValue: 'Sign in to your {{appName}} workspace' },
      )}
      altPrompt={t(
        'login.altPrompt',
        { appName: APP_NAME },
        { defaultValue: 'New to {{appName}}?' },
      )}
      altLinkText={t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
      altLinkTo="/signup"
    >
      <form className={cm.cn(cm.stack(5))} onSubmit={handleSubmit}>
        <label className={cm.cn(cm.stack(1))} htmlFor="login-email">
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('ml', 1))}>
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </span>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderNameCompany',
              {},
              { defaultValue: 'name@company.com' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.textSize('base'),
              'h-12 bg-surface-container-high border-0 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
            )}
          />
        </label>

        <label className={cm.cn(cm.stack(1))} htmlFor="login-password">
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 1))}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('sm'),
                cm.textPrimary,
                cm.fontWeight('medium'),
                'hover:underline',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.textSize('base'),
              'h-12 bg-surface-container-high border-0 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
            )}
          />
        </label>

        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('base'),
            'h-12 rounded-xl text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-lg hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {submitting
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 18 }}
          >
            arrow_forward
          </span>
        </button>
      </form>
    </AuthShell>
  )
}
