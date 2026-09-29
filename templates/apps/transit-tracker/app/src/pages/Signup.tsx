import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthFeaturePanel } from '../components/AuthFeaturePanel.js'
import { MetroPulseAuthShell } from '../components/MetroPulseAuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, firstName, lastName) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatch, setMismatch] = useState<string | null>(null)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMismatch(null)
    if (password !== confirmPassword) {
      setMismatch(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/nearby', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via signup
    }
  }

  return (
    <MetroPulseAuthShell
      eyebrow={t('signup.eyebrow', { app: APP_NAME }, { defaultValue: 'Join {{app}}' })}
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t(
        'signup.subheading',
        {},
        {
          defaultValue:
            'Free forever — live boards for every stop, the trip planner, and service alerts.',
        },
      )}
      footer={
        <>
          <span className="text-on-surface-variant">
            {t('signup.haveAccount', {}, { defaultValue: 'Already a member?' })}{' '}
          </span>
          <Link to="/login" className={'text-primary font-bold hover:underline'}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3')}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
              )}
            />
          </label>
        </div>
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
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
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
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>

        {mismatch || error ? (
          <p
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {mismatch || error?.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </form>

      <OAuthButtons />

      {/* Design's "Commuter benefits" card — what a free account unlocks,
          listed under the form. */}
      <AuthFeaturePanel
        title={t('signup.benefitsTitle', {}, { defaultValue: 'Commuter benefits' })}
        badge={t('signup.benefitsBadge', {}, { defaultValue: 'Free account' })}
        items={[
          {
            icon: 'directions_walk',
            title: t(
              'signup.feature.walkBuffer.title',
              {},
              { defaultValue: 'Millisecond walk-buffer alarms' },
            ),
            body: t(
              'signup.feature.walkBuffer.body',
              {},
              {
                defaultValue:
                  'Departure alarms sized to your real walking pace, so the "when to leave" moment is computed for you — not guessed from a timetable.',
              },
            ),
          },
          {
            icon: 'nfc',
            title: t(
              'signup.feature.nfcSync.title',
              {},
              { defaultValue: 'NFC SmartCard & digital pass sync' },
            ),
            body: t(
              'signup.feature.nfcSync.body',
              {},
              {
                defaultValue:
                  'Your fare-card and pass preferences travel with the account — sign in on any device and the boards, planner, and alerts come with you.',
              },
            ),
          },
          {
            icon: 'notifications_active',
            title: t(
              'signup.feature.delayPings.title',
              {},
              { defaultValue: 'Deterministic delay pings' },
            ),
            body: t(
              'signup.feature.delayPings.body',
              {},
              {
                defaultValue:
                  'Delay notifications are derived from the same schedule clock the boards use — the ping and the board never disagree.',
              },
            ),
          },
          {
            icon: 'bookmarks',
            title: t(
              'signup.feature.savedCommutes.title',
              {},
              { defaultValue: 'Saved commutes & preferred platforms' },
            ),
            body: t(
              'signup.feature.savedCommutes.body',
              {},
              {
                defaultValue:
                  'Pin the stops and lines you ride daily and they lead every screen — home opens on your commute, not a city map.',
              },
            ),
          },
        ]}
      />
    </MetroPulseAuthShell>
  )
}
