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
  const [role, setRole] = useState<'student' | 'tutor'>('student')
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
      /* tracked in hook */
    }
  }

  return (
    <AuthShell
      eyebrow={t(
        'signup.eyebrow',
        { appName: APP_NAME },
        { defaultValue: 'Welcome to {{appName}}' },
      )}
      heading={t('signup.heading', {}, { defaultValue: 'Where minds meet — start free.' })}
      subheading={t(
        'signup.subheading',
        {},
        {
          defaultValue:
            'Create an account to book sessions, message tutors, and track your progress.',
        },
      )}
      footerLeft={t('signup.terms', {}, { defaultValue: 'By signing up you agree to our Terms.' })}
      footerRight={
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('semibold'),
            'text-primary hover:underline decoration-2 underline-offset-4',
          )}
        >
          {t('signup.backToLogin', {}, { defaultValue: 'Already have an account? Sign in →' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('signup.role', {}, { defaultValue: 'I’m joining as' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'rounded-full bg-surface-container-low p-1',
            )}
          >
            {(['student', 'tutor'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cm.cn(
                  cm.flex1,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full px-4 py-2 transition-all',
                  role === r
                    ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t(`signup.role.${r}`, {}, { defaultValue: r === 'student' ? 'Learner' : 'Tutor' })}
              </button>
            ))}
          </div>
        </div>

        <Field label={t('signup.name', {}, { defaultValue: 'Full name' })}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              'px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
            )}
            placeholder="Sara Ahmed"
          />
        </Field>

        <Field label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}>
          <span className={cm.cn('relative block')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
            >
              mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'pl-11 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
              )}
              placeholder={`you@${APP_NAME.toLowerCase()}.app`}
            />
          </span>
        </Field>

        <Field label={t('auth.login.password', {}, { defaultValue: 'Password' })}>
          <span className={cm.cn('relative block')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'pl-11 pr-12 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
              )}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1',
              )}
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
            >
              <span className={cm.cn('material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </span>
        </Field>

        {error && (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'rounded-xl py-3.5 text-on-primary shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 100%)',
          }}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t(
                'signup.signUp',
                { role: role === 'student' ? 'learner' : 'tutor' },
                { defaultValue: 'Create my {{role}} account' },
              )}
          {!isSigningUp && (
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              arrow_forward
            </span>
          )}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(2)}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
