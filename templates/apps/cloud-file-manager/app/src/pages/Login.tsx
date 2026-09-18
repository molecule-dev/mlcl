import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/files')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Sign in failed. Please try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Sign in to access your archive.' })}
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {error && (
          <div
            role="alert"
            data-mol-id="login-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              cm.fontWeight('medium'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="email"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative bg-surface-container-high rounded-xl py-3',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-outline mr-3')}>mail</span>
            <input
              id="email"
              data-mol-id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-0 focus:ring-0 focus:outline-none text-on-surface placeholder:text-outline',
              )}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <label
              htmlFor="password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              to="/forgot-password"
              data-mol-id="login-forgot-link"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative bg-surface-container-high rounded-xl py-3',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-outline mr-3')}>lock</span>
            <input
              id="password"
              data-mol-id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-0 focus:ring-0 focus:outline-none text-on-surface placeholder:text-outline',
              )}
            />
            <button
              type="button"
              data-mol-id="login-toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn('text-outline hover:text-primary transition-colors')}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          data-mol-id="login-submit"
          disabled={loading}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.sp('mt', 2),
            cm.fontWeight('semibold'),
            'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </form>

      <OAuthButtons />

      <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
        <Link
          to="/signup"
          data-mol-id="login-signup-link"
          className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline ml-1')}
        >
          {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
        </Link>
      </p>

      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          cm.sp('mt', 2),
        )}
      >
        <LegalModalLinks
          linkClassName={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </AuthShell>
  )
}

export default Login
