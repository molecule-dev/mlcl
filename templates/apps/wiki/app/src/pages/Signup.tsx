import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

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
  const subdomain = authFormFields.subdomain ?? ''
  const setSubdomain = (value: string): void => setAuthFormField('subdomain', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: `${firstName} ${lastName}`.trim() })
      clearAuthForm()
      navigate('/home', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via signup error; no additional handling needed.
    }
  }

  const isSigningUp = status === 'pending'

  return (
    <AuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Start a new workspace' })}
      heading={t('signup.heading', {}, { defaultValue: 'Create your cairn' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Stack knowledge with your team — free for the first 5 editors.' },
      )}
      meta={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link to="/login" className={cm.cn('font-semibold text-primary hover:underline')}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <div className={cm.cn('grid grid-cols-2 gap-3')}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              placeholder="Alex"
              className={cm.cn(
                cm.sp('px', 4),
                'h-12 rounded-lg border border-outline-variant bg-surface-container-lowest text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all',
              )}
            />
          </label>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              placeholder="Lin"
              className={cm.cn(
                cm.sp('px', 4),
                'h-12 rounded-lg border border-outline-variant bg-surface-container-lowest text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all',
              )}
            />
          </label>
        </div>

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
              required
              autoComplete="email"
              placeholder="you@team.com"
              className={cm.cn(
                'flex-1 bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none',
              )}
            />
          </div>
        </label>

        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('signup.subdomain', {}, { defaultValue: 'Workspace subdomain' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'h-12 rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-all',
            )}
          >
            <input
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              placeholder="lighthouse"
              className={cm.cn(
                cm.sp('px', 4),
                'flex-1 bg-transparent text-base text-on-surface focus:outline-none',
              )}
            />
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('sm'),
                'h-full flex items-center bg-surface-container-low/60 text-on-surface-variant border-l border-outline-variant/40',
              )}
            >
              .cairn.dev
            </span>
          </div>
        </label>

        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
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
              required
              autoComplete="new-password"
              placeholder="At least 12 characters"
              minLength={12}
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
          disabled={isSigningUp}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'h-12 rounded-lg bg-primary text-on-primary text-base font-semibold hover:bg-primary-hover disabled:opacity-60 transition-colors',
          )}
        >
          {isSigningUp ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined animate-spin text-[18px]')}
                aria-hidden="true"
              >
                progress_activity
              </span>
              {t('common.creatingWorkspaceEllipsis', {}, { defaultValue: 'Creating workspace…' })}
            </>
          ) : (
            t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })
          )}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}
