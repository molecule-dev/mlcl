import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
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
  const [confirm, setConfirm] = useState('')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await signup({ email, password, name: `${firstName} ${lastName}`.trim() || undefined })
      clearAuthForm()
      navigate('/boards', { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })!}
      heading={t('signup.heading', {}, { defaultValue: 'Start a board, in 30 seconds' })!}
      subheading={t(
        'signup.subheading',
        {},
        {
          defaultValue:
            'Free for up to 3 collaborators. No credit card needed for the first 14 days.',
        },
      )!}
      showOAuth
      oauth={<OAuthButtons />}
      bottomLink={{
        to: '/login',
        prompt: t(
          'auth.login.alreadyHaveAccount',
          {},
          { defaultValue: 'Already have an account?' },
        )!,
        cta: t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })!,
      }}
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.stack(5))}>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }))}>
          <label className={cm.cn(cm.stack(2))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
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
              placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Mira' })!}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
              )}
            />
          </label>
          <label className={cm.cn(cm.stack(2))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
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
              placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Patel' })!}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
              )}
            />
          </label>
        </div>
        <label className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
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
            placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'mira@studio.com' })!}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
            )}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
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
            placeholder={t('signup.passwordPlaceholder', {}, { defaultValue: '8+ characters' })!}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
            )}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
            )}
          />
          {confirm && confirm !== password && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-error')}>
              {t(
                'auth.signup.passwordsDoNotMatchPeriod',
                {},
                { defaultValue: 'Passwords do not match.' },
              )}
            </span>
          )}
        </label>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {error.message}
          </div>
        )}
        <button
          type="submit"
          disabled={isSigningUp || (confirm !== '' && confirm !== password)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60',
          )}
        >
          {isSigningUp
            ? t('common.creatingWorkspaceEllipsis', {}, { defaultValue: 'Creating workspace…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  )
}

export default Signup
