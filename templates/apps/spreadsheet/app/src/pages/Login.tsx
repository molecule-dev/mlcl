import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CalciteAuthHeader } from '../components/CalciteAuthHeader.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/workbooks'
  const { status, error, login } = useLogin()
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

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error is tracked in error state by useLogin; nothing to do here
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative',
      )}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      <main className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/5 border border-outline-variant/40',
          )}
        >
          <CalciteAuthHeader />

          <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className={'px-4 py-3 text-sm text-error bg-error-container/40 rounded-xl'}
              >
                {error.message}
              </div>
            )}
            <div className={cm.stack(2)}>
              <label
                htmlFor="login-email"
                className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
              >
                {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder={t(
                  'auth.passwordPlaceholderNameCompany',
                  {},
                  { defaultValue: 'name@company.com' },
                )}
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                )}
              />
            </div>
            <div className={cm.stack(2)}>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <label
                  htmlFor="login-password"
                  className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <Link
                  to="/forgot-password"
                  className={'text-xs font-bold text-primary hover:underline'}
                >
                  {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none text-on-surface placeholder:text-on-surface-variant transition-all',
                )}
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className={
                'w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-on-primary rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:cursor-not-allowed'
              }
            >
              {isLoggingIn
                ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                : t('login.signIn', { name: APP_NAME }, { defaultValue: 'Sign in to {{name}}' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>
          <OAuthButtons />
        </div>
        <p
          className={cm.cn(
            cm.sp('mt', 8),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('login.noAccount', { name: APP_NAME }, { defaultValue: 'New to {{name}}?' })}{' '}
          <Link
            to="/signup"
            className={'text-primary font-bold hover:underline decoration-2 underline-offset-4'}
          >
            {t('login.signUp', {}, { defaultValue: 'Create a workspace' })}
          </Link>
        </p>
      </main>
      <footer
        className={cm.cn(
          cm.sp('mt', 16),
          cm.flex({ align: 'center', gap: 'lg' }),
          'relative z-10 text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant',
        )}
      >
        <Link to="/" className={'hover:text-primary transition-colors'}>
          {t('auth.footer.about', { name: APP_NAME }, { defaultValue: 'About {{name}}' })}
        </Link>
        <LegalModalLinks
          linkClassName={'hover:text-primary transition-colors'}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </footer>
    </div>
  )
}

export default Login
