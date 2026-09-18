import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { VendryAuthShell } from '../components/VendryAuthShell.js'
import { loadContent } from '../config.js'

type AccountType = 'shopper' | 'vendor'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/catalog'
  const { status, error, login } = useLogin()
  const [accountType, setAccountType] = useState<AccountType>('shopper')
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // standalone /privacy and /terms routes still exist for deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // tracked in hook state — the useLogin hook surfaces it via its own error field
    }
  }

  return (
    <VendryAuthShell
      heading={t(
        'login.heading',
        { appName: APP_NAME },
        { defaultValue: 'Welcome back to {{appName}}' },
      )}
      subheading={t(
        'login.subheading',
        {},
        { defaultValue: 'Sign in to keep shopping or jump back into your shop.' },
      )}
      bottomPrompt={
        <>
          {t('login.signupPrompt', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
          <Link
            to="/signup"
            className={'font-semibold text-orange-700 dark:text-primary hover:underline'}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.stack(5))}>
        {/* Shopper / Vendor toggle */}
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
                'capitalize transition-colors',
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

        <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <span className="font-semibold text-on-surface-variant">
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface-container-low border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
              alternate_email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={cm.cn(
                cm.w('full'),
                'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </label>

        <div className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
            <label htmlFor="login-password" className="font-semibold text-on-surface-variant">
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                'text-orange-700 dark:text-primary hover:underline font-semibold',
              )}
            >
              {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface-container-low border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
              lock
            </span>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cm.cn(
                cm.w('full'),
                'bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </div>

        {error && (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'rounded-xl bg-error/10 text-error',
            )}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.sp('py', 4),
            cm.roundedFull,
            'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden>
            {accountType === 'vendor' ? 'storefront' : 'shopping_basket'}
          </span>
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : accountType === 'vendor'
              ? t('login.submitVendor', {}, { defaultValue: 'Sign in to my shop' })
              : t('login.submitShopper', {}, { defaultValue: 'Sign in to shop' })}
        </button>

        <OAuthButtons />

        <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
          {t('login.legalPrefix', {}, { defaultValue: 'By signing in, you agree to our' })}{' '}
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

export default Login
