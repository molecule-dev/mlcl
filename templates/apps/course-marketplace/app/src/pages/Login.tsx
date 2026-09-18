import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

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
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }
  const { login } = useAuth()
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
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      const from = location.state?.from?.pathname ?? '/my-learning'
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.errorInvalidCredentials', {}, { defaultValue: 'Invalid email or password.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('login.subheading', {}, { defaultValue: 'Access your scholarly archive.' })}
      footer={
        <>
          <span className={cm.cn('text-on-surface-variant')}>
            {t('login.newPrompt', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}
          </span>{' '}
          <Link
            to="/signup"
            className={
              'text-primary hover:text-primary-container hover:underline decoration-2 underline-offset-4 transition-all'
            }
          >
            {t('login.startLearning', {}, { defaultValue: 'Start learning today' })}
          </Link>
          {/* Privacy/Terms open IN-PLACE modals instead of navigating away — the
              standalone /privacy and /terms routes still exist for deep links. */}
          <div className={cm.cn('mt-4 flex items-center justify-center gap-4 text-xs')}>
            <LegalModalLinks
              linkClassName={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </>
      }
    >
      <form className={cm.cn('space-y-5')} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            data-mol-id="login-error"
            className={cm.cn(
              'px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm',
            )}
          >
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="email"
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="scholar@institution.edu"
              className={
                'w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
              }
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="password"
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={
                'w-full pl-12 pr-12 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              data-mol-id="toggle-password"
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={
                'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              <span className={cm.cn('material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        <div className={cm.cn('flex items-center justify-between text-sm')}>
          <label className={cm.cn('flex items-center gap-2 cursor-pointer')}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className={
                'w-4 h-4 rounded text-primary focus:ring-primary/40 border-outline-variant/30 bg-surface-container-low'
              }
            />
            <span className={cm.cn('text-on-surface-variant font-medium')}>
              {t('auth.login.rememberMe', {}, { defaultValue: 'Remember me' })}
            </span>
          </label>
          <Link
            to="/forgot-password"
            className={'font-bold text-primary hover:text-primary-container transition-colors'}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>
        <button
          type="submit"
          data-mol-id="btn-login"
          disabled={loading}
          className={cm.cn(
            'w-full py-3.5 px-4 bg-primary-container text-on-primary font-bold rounded-xl shadow-[0px_8px_24px_rgba(99,54,224,0.25)] hover:bg-primary hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70',
          )}
        >
          {loading
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>
      <div className={cm.cn('mt-6')}>
        <OAuthButtons />
      </div>
    </AuthShell>
  )
}

export default Login
