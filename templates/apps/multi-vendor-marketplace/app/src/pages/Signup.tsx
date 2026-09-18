import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { VendryAuthShell } from '../components/VendryAuthShell.js'
import { loadContent } from '../config.js'

type AccountType = 'shopper' | 'vendor'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  const [accountType, setAccountType] = useState<AccountType>('shopper')
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatch, setMismatch] = useState<string | null>(null)
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // standalone /privacy and /terms routes still exist for deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMismatch(null)
    if (password !== confirmPassword) {
      setMismatch(t('signup.mismatch', {}, { defaultValue: "Passwords don't match yet." }))
      return
    }
    try {
      await signup({
        email,
        password,
        name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      })
      clearAuthForm()
      navigate(accountType === 'vendor' ? '/vendor/apply' : '/catalog', { replace: true })
    } catch (_error) {
      // tracked in hook state — the useSignup hook surfaces it via its own error field
    }
  }

  return (
    <VendryAuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Join the marketplace' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Browse 4,000+ independent makers, or open a shop of your own.' },
      )}
      bottomPrompt={
        <>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={'font-semibold text-orange-700 dark:text-primary hover:underline'}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.stack(5))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('p', 1),
            'rounded-full bg-surface-container-low',
          )}
          role="tablist"
          aria-label={t('login.accountTypeAria', {}, { defaultValue: 'Account type' })}
        >
          {(['shopper', 'vendor'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={accountType === type}
              onClick={() => setAccountType(type)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('py', 2),
                cm.w('full'),
                cm.roundedFull,
                'transition-colors',
                accountType === type
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {type === 'shopper'
                ? t('login.tabShopper', {}, { defaultValue: 'Shopper' })
                : t('login.tabVendor', {}, { defaultValue: 'Vendor' })}
            </button>
          ))}
        </div>

        <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }))}>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </span>
            <input
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Helena"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </span>
            <input
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Souza"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
        </div>

        <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <span className="font-semibold text-on-surface-variant">
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="helena@example.com"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
            )}
          />
        </label>

        <div className={cm.cn(cm.grid({ cols: 1, gap: 'sm' }), 'md:grid-cols-2')}>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
        </div>

        {(error || mismatch) && (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'rounded-xl bg-error/10 text-error',
            )}
          >
            {mismatch ?? error?.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.sp('py', 4),
            cm.roundedFull,
            'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden>
            {accountType === 'vendor' ? 'add_business' : 'shopping_basket'}
          </span>
          {isSigningUp
            ? t(
                'common.creatingYourAccountEllipsis',
                {},
                { defaultValue: 'Creating your account…' },
              )
            : t('signup.submit', {}, { defaultValue: 'Join the marketplace' })}
        </button>

        <OAuthButtons />

        <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
          {t('signup.legalPrefix', {}, { defaultValue: 'By joining, you agree to our' })}{' '}
          <button
            type="button"
            onClick={openTerms}
            className={'font-semibold text-orange-700 dark:text-primary hover:underline'}
          >
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </button>{' '}
          {t('common.and', {}, { defaultValue: 'and' })}{' '}
          <button
            type="button"
            onClick={openPrivacy}
            className={'font-semibold text-orange-700 dark:text-primary hover:underline'}
          >
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </button>
          .
        </p>
      </form>
      {modals}
    </VendryAuthShell>
  )
}

export default Signup
