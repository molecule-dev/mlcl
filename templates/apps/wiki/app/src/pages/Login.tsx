import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/home'
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
      // Error tracked in hook state via login error; no additional handling needed.
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <AuthShell
      eyebrow={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      heading={t('login.heading', {}, { defaultValue: 'Sign in to your cairn' })}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Pick up where the team left off — your last edit is two minutes old.' },
      )}
      meta={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('login.signupPrompt', {}, { defaultValue: "Don't have a workspace yet?" })}{' '}
          <Link to="/signup" className={cm.cn('font-semibold text-primary hover:underline')}>
            {t('login.signupLink', {}, { defaultValue: 'Start one' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              'h-12 rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-all',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@team.com"
              className={cm.cn(
                'flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
              )}
            />
          </div>
        </label>
        <label className={cm.stack(2)}>
          <span className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(cm.textSize('xs'), 'font-semibold text-primary hover:underline')}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              'h-12 rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-all',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className={cm.cn(
                'flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
              )}
            />
          </div>
        </label>

        {error ? (
          <p
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-md bg-error/10 border border-error/40 text-on-surface',
            )}
          >
            {error.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'h-12 rounded-lg bg-primary text-on-primary text-base font-semibold hover:bg-primary-hover disabled:opacity-60 transition-colors',
          )}
        >
          {isLoggingIn ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined animate-spin text-[18px]')}
                aria-hidden="true"
              >
                progress_activity
              </span>
              {t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })}
            </>
          ) : (
            t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })
          )}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}
