import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // tracked in hook state — the hook surfaces error; no action needed here
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <AuthShell
      heading={t('login.heading', {}, { defaultValue: 'Welcome back, climber.' })}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Pick up where you left off — your check-ins, KRs, and reviews are waiting.',
        },
      )}
      footerPrompt={
        <span>
          {t(
            'login.noAccountPrompt',
            { appName: APP_NAME },
            { defaultValue: 'New to {{appName}}? ' },
          )}
          <Link to="/signup" className={cm.cn('font-bold text-indigo-700 hover:text-indigo-900')}>
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.stack(4))}>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@team.com' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full rounded-xl border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all',
            )}
          />
        </label>
        <label className={cm.cn(cm.stack(1))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn('text-xs font-bold text-indigo-700 hover:text-indigo-900')}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full rounded-xl border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all',
            )}
          />
        </label>
        {error && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-lg bg-error-light text-error border border-red-200',
            )}
          >
            {error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'w-full rounded-xl text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-secondary) 100%)',
          }}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>
      <div className={cm.cn(cm.stack(3))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'before:flex-1 before:h-px before:bg-outline-variant after:flex-1 after:h-px after:bg-outline-variant',
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('login.orContinueWith', {}, { defaultValue: 'or continue with' })}
          </span>
        </div>
        <OAuthButtons />
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }))}>
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
