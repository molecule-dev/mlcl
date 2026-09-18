import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthField } from '../components/AuthField.js'
import { CairnAuthBrandPanel } from '../components/CairnAuthBrandPanel.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signup, status, error: signupError } = useSignup()
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
  const [localError, setLocalError] = useState<string | null>(null)

  const loading = status === 'pending'
  const error = localError ?? (signupError instanceof Error ? signupError.message : null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) {
      setLocalError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    const fullName = [firstName, lastName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ')
    try {
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/home')
    } catch (_error) {
      // Error already tracked in signupError via useSignup hook; no additional handling needed
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <CairnAuthBrandPanel
        quote={t(
          'signup.brandQuote',
          {},
          {
            defaultValue:
              '\u201cWriting it down is the first promise we make to the next person who needs it.\u201d',
          },
        )}
        attribution={t(
          'signup.brandAttribution',
          { appName: APP_NAME },
          { defaultValue: '{{appName}} — internal docs, not internal lore' },
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
              {t('signup.eyebrow', {}, { defaultValue: 'Open a workspace' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
            </h1>
            <p
              className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), 'italic text-on-surface-variant')}
              style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
            >
              {t(
                'signup.subtitle',
                {},
                { defaultValue: 'Stack the first stone. Invite the team after.' },
              )}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8), 'space-y-5')}>
            <div className={cm.grid({ cols: 2, gap: 'sm' })}>
              <AuthField
                id="firstName"
                type="text"
                label={t('form.firstName', {}, { defaultValue: 'First name' })}
                placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Maya' })}
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                required
              />
              <AuthField
                id="lastName"
                type="text"
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Patel' })}
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                required
              />
            </div>
            <AuthField
              id="email"
              type="email"
              label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <AuthField
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
            <AuthField
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
                ? t('signup.submitting', {}, { defaultValue: 'Creating workspace\u2026' })
                : t('signup.submit', {}, { defaultValue: 'Create workspace' })}
            </button>
          </form>

          <div className={cm.cn(cm.sp('mt', 8))}>
            <OAuthButtons />
          </div>

          <p className={cm.cn(cm.sp('mt', 8), 'text-center text-sm text-on-surface-variant')}>
            {t('signup.haveAccount', {}, { defaultValue: 'Already have a workspace?' })}{' '}
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
