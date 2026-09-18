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
  const [showPassword, setShowPassword] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional handling needed here
    }
  }

  const inputWrap = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 4),
    'relative bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
  )
  const inputCls = cm.cn(
    cm.w('full'),
    cm.fontWeight('medium'),
    'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
  )
  const labelCls = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    cm.sp('ml', 1),
    'uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <AuthShell
      title={t('signup.title', {}, { defaultValue: 'Start your trial' })}
      subtitle={t('signup.subtitle', {}, { defaultValue: '14 days free, no card required.' })}
      footerPrompt={
        <>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              'font-bold hover:underline decoration-2 underline-offset-4 ml-1 text-primary',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label htmlFor="name" className={labelCls} style={{ fontSize: 10 }}>
            {t('form.name', {}, { defaultValue: 'Name' })}
          </label>
          <div className={inputWrap}>
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              person
            </span>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder={t(
                'signup.identityPrompt',
                {},
                { defaultValue: 'How should we address you?' },
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label htmlFor="email" className={labelCls} style={{ fontSize: 10 }}>
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <div className={inputWrap}>
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label htmlFor="password" className={labelCls} style={{ fontSize: 10 }}>
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div className={inputWrap}>
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('ml-2 text-on-surface-variant hover:text-primary transition-colors')}
            >
              <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 20 }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <div
            data-mol-id="signup-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-full text-on-primary hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}
