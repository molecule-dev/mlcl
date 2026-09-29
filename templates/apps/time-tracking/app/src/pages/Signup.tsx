import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'
import { AuthField } from './Login.js'

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

  const isSigningUp = status === 'pending'
  const passwordMismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      const name = `${firstName} ${lastName}`.trim() || undefined
      await signup({ email, password, name })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error state is tracked inside the signup hook
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex({}), 'bg-surface-secondary antialiased')}>
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 12),
          'hidden lg:flex w-[42%] relative overflow-hidden bg-gradient-to-br from-emerald-600 via-blue-700 to-blue-900 text-white',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
          <BrandWordmark as="span" size="lg" invert />
        </Link>

        <div className={cm.cn('relative z-10', cm.stack(8))}>
          <div className={cm.stack(4)}>
            <p
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-widest text-emerald-100/80',
              )}
            >
              {t('signup.brand.eyebrow', {}, { defaultValue: 'Start tracking — free' })}
            </p>
            <h1
              className={cm.cn('text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.05]')}
            >
              {t(
                'signup.brand.headline',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}}' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-emerald-50/90 max-w-md leading-relaxed')}>
              {t(
                'signup.brand.subtitle',
                {},
                {
                  defaultValue:
                    'Three projects on the house. Stripe-backed invoices the moment you go pro.',
                },
              )}
            </p>
          </div>
          <ul className={cm.stack(3)}>
            {[
              {
                key: 'signup.brand.perkProjects',
                defaultValue: 'Track unlimited entries on up to 3 projects',
              },
              {
                key: 'signup.brand.perkBudgets',
                defaultValue: 'Color-coded budgets with live burn-down',
              },
              {
                key: 'signup.brand.perkExport',
                defaultValue: 'Export CSV anytime, no lock-in',
              },
            ].map((perk) => (
              <li
                key={perk.key}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  'text-emerald-50/90',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-emerald-200')}>
                  check_circle
                </span>
                {t(perk.key, {}, { defaultValue: perk.defaultValue })}
              </li>
            ))}
          </ul>
        </div>

        <p className={cm.cn(cm.textSize('xs'), 'relative z-10 text-emerald-100/60')}>
          {t(
            'signup.brand.legal',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}.' },
          )}
        </p>
        <div
          className={cm.cn(
            'absolute -right-32 -top-32 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-blue-300/20 blur-3xl',
          )}
        />
      </aside>

      <main
        className={cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(8))}>
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'lg:hidden')}>
            <BrandWordmark as="span" />
          </Link>

          <div className={cm.stack(2)}>
            <h2 className={cm.cn('text-3xl font-extrabold tracking-tight text-foreground')}>
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
              {t('signup.subheading', {}, { defaultValue: 'No credit card required.' })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cm.stack(4)} data-test="signup-form">
            <div className={cm.cn('grid grid-cols-2 gap-3')}>
              <AuthField
                label={t('form.firstName', {}, { defaultValue: 'First name' })}
                icon="person"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
                data-test="signup-first-name"
              />
              <AuthField
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                icon="person_outline"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                data-test="signup-last-name"
              />
            </div>
            <AuthField
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              icon="mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              data-test="signup-email"
            />
            <AuthField
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              icon="lock"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              data-test="signup-password"
            />
            <AuthField
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              icon="lock"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              data-test="signup-confirm"
            />
            {passwordMismatch && (
              <p className={cm.cn(cm.textSize('xs'), 'text-error')}>
                {t(
                  'auth.signup.passwordsDontMatchPeriod',
                  {},
                  { defaultValue: "Passwords don't match." },
                )}
              </p>
            )}
            {error && (
              <p
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('xs'),
                  'rounded-lg bg-rose-50 text-error border border-rose-200',
                )}
              >
                {error.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isSigningUp || passwordMismatch}
              data-test="signup-submit"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all',
              )}
            >
              {isSigningUp
                ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              {!isSigningUp && (
                <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <OAuthButtons />

          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-foreground-secondary')}>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-blue-600 hover:underline')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>

          {/* Privacy/Terms open IN-PLACE modals (the bonded legal HTML is
              pre-loaded via loadContent); the standalone /privacy and /terms
              routes still exist for deep links. */}
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }))}>
            <LegalModalLinks
              linkClassName={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-foreground-secondary hover:text-blue-600 transition-colors',
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
export { Signup as SignupPage }
