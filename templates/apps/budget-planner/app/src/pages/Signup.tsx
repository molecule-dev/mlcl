import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthSplitLayout } from '../components/AuthSplitLayout.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'
import { AuthField } from './Login.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // bonded legal HTML is pre-loaded via loadContent before each modal opens.
  // The standalone /privacy and /terms routes still exist for deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
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
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await register({ email, password, name })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'signup.failed',
              {},
              { defaultValue: 'Could not create your account. Try a different email.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t('signup.subheading', {}, { defaultValue: 'Start giving every dollar a job.' })}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), cm.textPrimary, 'hover:underline')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/20',
            )}
          >
            {error}
          </div>
        ) : null}

        <AuthField
          id="name"
          label={t('form.fullName', {}, { defaultValue: 'Full name' })}
          icon="person"
        >
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Alex Coffer' })}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <AuthField
          id="email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          icon="mail"
        >
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <AuthField
          id="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          icon="lock"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          }
        >
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <AuthField
          id="confirm"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          icon="lock"
        >
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t(
              'auth.signup.repeatYourPassword',
              {},
              { defaultValue: 'Repeat your password' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
            )}
          />
        </AuthField>

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('base'),
            'rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md',
          )}
        >
          {loading
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
          {t(
            'signup.legalPrefix',
            { appName: APP_NAME },
            { defaultValue: 'By creating an account you agree to the {{appName}}' },
          )}{' '}
          <button
            type="button"
            onClick={openTerms}
            className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'), 'hover:underline')}
          >
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </button>{' '}
          {t('signup.and', {}, { defaultValue: 'and' })}{' '}
          <button
            type="button"
            onClick={openPrivacy}
            className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'), 'hover:underline')}
          >
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </button>
          .
        </p>
      </form>

      <OAuthButtons />
      {modals}
    </AuthSplitLayout>
  )
}
