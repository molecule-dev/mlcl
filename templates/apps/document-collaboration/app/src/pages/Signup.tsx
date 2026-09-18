import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { QuillonAuthBrandPanel } from '../components/QuillonAuthBrandPanel.js'
import { Field } from './Login.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { status, error: signupError, signup } = useSignup()
  const navigate = useNavigate()
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
  const [mismatch, setMismatch] = useState<string | null>(null)
  const loading = status === 'pending'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMismatch(null)
    if (password !== confirm) {
      setMismatch(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // hook owns error state — signupError is already surfaced in the UI
    }
  }

  const error =
    mismatch ??
    (signupError instanceof Error ? signupError.message : signupError ? String(signupError) : null)

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <QuillonAuthBrandPanel
        quote={t(
          'signup.brandQuote',
          { appName: APP_NAME },
          {
            defaultValue:
              '\u201cYour first manuscript is the hardest. {{appName}} makes it less lonely.\u201d',
          },
        )}
        attribution={t(
          'signup.brandAttribution',
          {},
          { defaultValue: 'Anaïs Park — Editor, The Quarterly' },
        )}
      />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
          cm.sp('py', 12),
          'w-full lg:w-1/2',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[480px]')}>
          <header>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-secondary',
              )}
            >
              {t('signup.eyebrow', {}, { defaultValue: 'Open the studio' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'signup.heading',
                { appName: APP_NAME },
                { defaultValue: 'Create your {{appName}} account' },
              )}
            </h1>
            <p
              className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), 'italic text-on-surface-variant')}
              style={{ fontFamily: 'Charter, Georgia, serif' }}
            >
              {t(
                'signup.subtitle',
                {},
                {
                  defaultValue:
                    'A quiet desk, ambient collaborators, and a long-form editor that gets out of your way.',
                },
              )}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8), 'space-y-5')}>
            <div className={cm.grid({ cols: 2, gap: 'sm' })}>
              <Field
                id="firstName"
                type="text"
                label={t('form.firstName', {}, { defaultValue: 'First name' })}
                placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Anaïs' })}
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                required
              />
              <Field
                id="lastName"
                type="text"
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Park' })}
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                required
              />
            </div>
            <Field
              id="email"
              type="email"
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'writer@studio.com' })}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              id="password"
              type="password"
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              placeholder={t(
                'common.atLeast12Characters',
                {},
                { defaultValue: 'At least 12 characters' },
              )}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
            />
            <Field
              id="confirm"
              type="password"
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              placeholder={t(
                'auth.signup.repeatYourPassword',
                {},
                { defaultValue: 'Repeat your password' },
              )}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
            />

            {error ? (
              <p
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-error/10 text-error',
                )}
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('extrabold'),
                'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0',
              )}
            >
              {loading
                ? t('signup.submitting', {}, { defaultValue: 'Opening your studio\u2026' })
                : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </button>
          </form>

          <div className={cm.cn(cm.sp('mt', 8))}>
            <OAuthButtons />
          </div>

          <p className={cm.cn(cm.sp('mt', 8), 'text-center text-sm text-on-surface-variant')}>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('extrabold'), 'text-primary hover:underline')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Signup
