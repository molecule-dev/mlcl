import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'
import { Field } from './Login.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
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
  const company = authFormFields.company ?? ''
  const setCompany = (value: string): void => setAuthFormField('company', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim() || firstName || lastName || email
      await register({
        email,
        password,
        name: fullName,
      } as Parameters<typeof register>[0])
      // Persist company on the profile (oauthData) — the user resource POST
      // strips unknown props, so we PATCH /api/profile/me right after.
      if (company.trim()) {
        try {
          const http = (await import('@molecule/app-http')).getClient()
          await http.patch('/api/profile/me', { company: company.trim() })
        } catch (_error) {
          // non-blocking: company patch failure must not prevent successful signup
        }
      }
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Could not create account.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <AuthBrandPanel
        quote={t(
          'signup.brandQuote',
          { appName: APP_NAME },
          {
            defaultValue:
              '\u201cWe migrated 8 years of paper into {{appName}} in a week. The audit trail alone justifies the swap.\u201d',
          },
        )}
        attribution={t(
          'signup.brandAttribution',
          {},
          { defaultValue: 'Devon Park \u2014 General Counsel, Globex Corp' },
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
                'uppercase tracking-widest text-[var(--mol-color-secondary)]',
              )}
            >
              {t('signup.eyebrow', {}, { defaultValue: 'Start a workspace' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'signup.subtitle',
                {},
                {
                  defaultValue:
                    'Migrate templates, import legacy records, send your first contract today.',
                },
              )}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8), 'space-y-5')}>
            <div className={cm.grid({ cols: 2, gap: 'sm' })}>
              <Field
                id="signup-firstName"
                type="text"
                label={t('form.firstName', {}, { defaultValue: 'First name' })}
                placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Morgan' })}
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                required
              />
              <Field
                id="signup-lastName"
                type="text"
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Reyes' })}
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                required
              />
            </div>
            <Field
              id="signup-email"
              type="email"
              label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              placeholder={t(
                'auth.passwordPlaceholderNameCompany',
                {},
                { defaultValue: 'name@company.com' },
              )}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              id="signup-company"
              type="text"
              label={t('form.company', {}, { defaultValue: 'Company' })}
              placeholder={t(
                'signup.companyPlaceholder',
                {},
                { defaultValue: 'Northwind Traders' },
              )}
              value={company}
              onChange={setCompany}
              autoComplete="organization"
              required
            />
            <Field
              id="signup-password"
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
              id="signup-confirm"
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
                'rounded-full bg-gradient-to-br from-sidebar-bg to-[var(--mol-color-primary)] text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0',
              )}
            >
              {loading
                ? t('signup.submitting', {}, { defaultValue: 'Creating account\u2026' })
                : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </button>
          </form>

          <div className={cm.cn(cm.sp('mt', 8))}>
            <OAuthButtons />
          </div>

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('extrabold'), 'text-primary hover:underline')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>

          <div
            className={cm.cn(
              cm.sp('mt', 6),
              cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
            )}
          >
            <LegalModalLinks
              linkClassName={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Signup
