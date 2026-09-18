import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_GRADIENT } from '../branding.js'
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
  const [showPassword, setShowPassword] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    const fullName = [firstName, lastName].filter(Boolean).join(' ')
    try {
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/ask', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via error — no action needed here
    }
  }

  return (
    <AuthShell
      title={t(
        'signup.title',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}} account' },
      )}
      subtitle={t(
        'signup.subtitle',
        {},
        { defaultValue: 'Index your first knowledge base in minutes.' },
      )}
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
        <div className={cm.cn('grid grid-cols-2 gap-4')}>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            <label
              htmlFor="firstName"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('ml', 1),
                'uppercase tracking-widest text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 4),
                'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
              )}
            >
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Ada' })}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
                )}
              />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            <label
              htmlFor="lastName"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('ml', 1),
                'uppercase tracking-widest text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 4),
                'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
              )}
            >
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Lovelace' })}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
                )}
              />
            </div>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            htmlFor="email"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            style={{ fontSize: 10 }}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
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
                'auth.passwordPlaceholderNameCompany',
                {},
                { defaultValue: 'name@company.com' },
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
              )}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            htmlFor="password"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            style={{ fontSize: 10 }}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
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
              required
              placeholder={t(
                'signup.passwordPlaceholder',
                {},
                { defaultValue: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' },
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
              )}
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

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            htmlFor="confirm"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            style={{ fontSize: 10 }}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              lock_reset
            </span>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder={t(
                'signup.confirmPlaceholder',
                {},
                { defaultValue: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' },
              )}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
              )}
            />
          </div>
        </div>

        {mismatch ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {t('signup.mismatch', {}, { defaultValue: 'Passwords don\u2019t match.' })}
          </div>
        ) : null}
        {error ? (
          <div
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
            'rounded-full text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20',
          )}
          style={{ background: BRAND_GRADIENT }}
        >
          {isSigningUp
            ? t('signup.submitting', {}, { defaultValue: 'Creating account\u2026' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}
