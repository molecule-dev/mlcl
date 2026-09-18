import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
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

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state (signupError is surfaced in the UI)
    }
  }

  return (
    <AuthShell>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 10),
          'rounded-[1.5rem] bg-surface-container-lowest border border-surface-container/50 shadow-2xl shadow-primary/10',
        )}
      >
        <AuthBrandHeader />
        <div className={cm.textCenter}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'tracking-tight')}>
            {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'signup.subtitle',
              {},
              { defaultValue: 'Translate your first project free for 14 days.' },
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <label
              htmlFor="name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('signup.fullNameHint', {}, { defaultValue: 'Your full name' })}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'h-12 bg-transparent border-0 border-b-2 border-surface-dim focus:border-primary focus:ring-0 focus:outline-none px-0 py-2 text-base placeholder:text-outline-variant transition-colors duration-300',
              )}
            />
          </div>

          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <label
              htmlFor="email"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'you@workspace.com' })}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'h-12 bg-transparent border-0 border-b-2 border-surface-dim focus:border-primary focus:ring-0 focus:outline-none px-0 py-2 text-base placeholder:text-outline-variant transition-colors duration-300',
              )}
            />
          </div>

          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
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
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast12Characters',
                {},
                { defaultValue: 'At least 12 characters' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'h-12 bg-transparent border-0 border-b-2 border-surface-dim focus:border-primary focus:ring-0 focus:outline-none px-0 py-2 text-base placeholder:text-outline-variant transition-colors duration-300',
              )}
            />
          </div>

          {error && (
            <div
              role="alert"
              data-mol-id="signup-error"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                cm.textCenter,
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSigningUp}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'w-full rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-all shadow-md shadow-primary/30 disabled:opacity-60',
            )}
          >
            {isSigningUp
              ? t('common.creatingWorkspaceEllipsis', {}, { defaultValue: 'Creating workspace…' })
              : t('signup.submit', {}, { defaultValue: 'Create workspace' })}
          </button>
        </form>

        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <span className={cm.cn('flex-1 h-px bg-surface-container-high')} />
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('common.or', {}, { defaultValue: 'or' })}
          </span>
          <span className={cm.cn('flex-1 h-px bg-surface-container-high')} />
        </div>

        <OAuthButtons />

        <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), cm.sp('ml', 1), 'text-primary hover:underline')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default Signup
export { Signup as SignupPage }
