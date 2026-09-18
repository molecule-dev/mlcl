import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AulaAuthShell } from '../components/AulaAuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

type Role = 'student' | 'instructor'

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
  const [role, setRole] = useState<Role>('student')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in the hook's error state — no local handling needed
    }
  }

  return (
    <AulaAuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Open your classroom' })}
      title={t(
        'signup.title',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}} account' },
      )}
      subtitle={t(
        'signup.subtitle',
        { appName: APP_NAME },
        {
          defaultValue:
            '{{appName}} is free for the first 30 days — no credit card needed. Invite your co-teachers any time.',
        },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        )}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
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
              placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Aiyana' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
              )}
            />
          </label>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
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
              placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Vega' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
              )}
            />
          </label>
        </div>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('signup.email', {}, { defaultValue: 'School email' })}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'you@school.edu' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
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
            minLength={8}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
        </label>
        <fieldset className={cm.stack(2)}>
          <legend
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('signup.roleLabel', {}, { defaultValue: 'I am a…' })}
          </legend>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            {(
              [
                {
                  key: 'student',
                  icon: 'school',
                  label: t('signup.roleStudent', {}, { defaultValue: 'Student' }),
                },
                {
                  key: 'instructor',
                  icon: 'auto_awesome',
                  label: t('signup.roleInstructor', {}, { defaultValue: 'Instructor' }),
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRole(opt.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl border-2 transition-colors text-left',
                  role === opt.key
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-primary/50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.fontWeight('bold'),
            cm.sp('py', 3),
            cm.sp('px', 5),
            'w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60',
          )}
          data-mol-id="btn-create-account"
        >
          <span>
            {isSigningUp
              ? t(
                  'common.creatingYourAccountEllipsis',
                  {},
                  { defaultValue: 'Creating your account…' },
                )
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </span>
          {!isSigningUp && (
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
          )}
        </button>
        <OAuthButtons />
      </form>
    </AulaAuthShell>
  )
}

export default Signup
