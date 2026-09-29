import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthFeaturePanel } from '../components/AuthFeaturePanel.js'
import { MetroPulseAuthShell } from '../components/MetroPulseAuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/nearby'
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
      // Error tracked in hook state via login
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <MetroPulseAuthShell
      eyebrow={t('login.eyebrow', { app: APP_NAME }, { defaultValue: '{{app}} members' })}
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Sign in to reach your saved stops, live boards, and planned trips from anywhere.',
        },
      )}
      footer={
        <>
          <span className="text-on-surface-variant">
            {t('login.noAccount', { app: APP_NAME }, { defaultValue: 'New to {{app}}?' })}{' '}
          </span>
          <Link to="/signup" className={'text-primary font-bold hover:underline'}>
            {t('login.signupLink', {}, { defaultValue: 'Create a free account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>

        {error ? (
          <p
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {error.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </form>

      <OAuthButtons />

      {/* Design's "Why sign in to MetroPulse?" companion card — the rider
          features an account unlocks, presented under the form. */}
      <AuthFeaturePanel
        title={t('login.whyTitle', { app: APP_NAME }, { defaultValue: 'Why sign in to {{app}}?' })}
        badge={t('login.whyBadge', {}, { defaultValue: 'Commuter features' })}
        items={[
          {
            icon: 'directions_walk',
            title: t(
              'login.feature.walkBuffer.title',
              {},
              { defaultValue: 'Millisecond walk-buffer alarms' },
            ),
            body: t(
              'login.feature.walkBuffer.body',
              {},
              {
                defaultValue:
                  'Boards compute your pacing to the platform and warn you when the walk buffer tightens — leave the office at the right second, not ten minutes early.',
              },
            ),
          },
          {
            icon: 'contactless',
            title: t(
              'login.feature.fareCard.title',
              {},
              { defaultValue: 'Commuter pass & SmartCard balance' },
            ),
            body: t(
              'login.feature.fareCard.body',
              {},
              {
                defaultValue:
                  'Keep your fare media and travel preferences in sync across every device you check boards from — phone, tablet, or a concourse kiosk.',
              },
            ),
          },
          {
            icon: 'notifications_active',
            title: t('login.feature.alertPing.title', {}, { defaultValue: 'Service alert ping' }),
            body: t(
              'login.feature.alertPing.body',
              {},
              {
                defaultValue:
                  'Detours, delays, and platform changes surface before you reach the stairs — the alert feed watches the lines behind your saved stops.',
              },
            ),
          },
        ]}
      />
    </MetroPulseAuthShell>
  )
}
