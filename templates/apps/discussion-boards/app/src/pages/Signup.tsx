import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
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
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatchError, setMismatchError] = useState('')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMismatchError('')
    if (password !== confirm) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/c', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      eyebrow={t('signup.eyebrow', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
      heading={t(
        'signup.heading',
        {},
        { defaultValue: 'Bring an idea. Stay for the conversation.' },
      )}
      subheading={t(
        'signup.subheading',
        {},
        {
          defaultValue: 'Free for the first 50 members of any community. No credit card required.',
        },
      )}
      footer={
        <>
          {t(
            'signup.haveAccount',
            { appName: APP_NAME },
            { defaultValue: 'Already on {{appName}}?' },
          )}{' '}
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <div className={cm.stack(2)}>
          <label
            htmlFor="signup-name"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.displayName', {}, { defaultValue: 'Display name' })}
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder={t(
              'signup.namePlaceholder',
              {},
              { defaultValue: 'How others will see you' },
            )}
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="signup-email"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'you@stoa.community' })}
            className={cm.cn(
              cm.sp('p', 3),
              'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
            )}
          />
        </div>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
          <div className={cm.stack(2)}>
            <label
              htmlFor="signup-password"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              className={cm.cn(
                cm.sp('p', 3),
                'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
              )}
            />
          </div>
          <div className={cm.stack(2)}>
            <label
              htmlFor="signup-confirm"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('signup.confirm', {}, { defaultValue: 'Confirm' })}
            </label>
            <input
              id="signup-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              className={cm.cn(
                cm.sp('p', 3),
                'w-full rounded-xl bg-surface-container border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-base',
              )}
            />
          </div>
        </div>
        {(mismatchError || error) && (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {mismatchError || error?.message}
          </p>
        )}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'signup.terms',
            {},
            {
              defaultValue:
                'By signing up you agree to the community guidelines and privacy policy.',
            },
          )}
        </p>
        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'inline-flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 disabled:opacity-60',
          )}
        >
          {isSigningUp ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined text-base animate-spin')}
                aria-hidden
              >
                progress_activity
              </span>
              {t(
                'common.creatingYourAccountEllipsis',
                {},
                { defaultValue: 'Creating your account…' },
              )}
            </>
          ) : (
            <>
              {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-on-surface-variant')}>
        <span className={cm.cn('h-px flex-1 bg-outline-variant/40')} />
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-widest')}
        >
          {t('signup.orContinueWith', {}, { defaultValue: 'or continue with' })}
        </span>
        <span className={cm.cn('h-px flex-1 bg-outline-variant/40')} />
      </div>
      <OAuthButtons />
    </AuthShell>
  )
}

export default Signup
