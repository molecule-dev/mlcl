import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register } = useAuth()
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
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Privacy/Terms open IN-PLACE modals instead of navigating away — the
  // standalone /privacy and /terms routes still exist for deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agree) {
      setError(
        t('signup.errorAgreeTerms', {}, { defaultValue: 'Please agree to the terms to continue.' }),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await register({ name, email, password })
      clearAuthForm()
      navigate('/my-learning', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.errorGeneric', {}, { defaultValue: 'Could not create account. Try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('signup.heading', {}, { defaultValue: 'Start your journey' })}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Create a free account and unlock thousands of courses.' },
      )}
      footer={
        <>
          <span className={cm.cn('text-on-surface-variant')}>
            {t('signup.haveAccount', {}, { defaultValue: 'Already a learner?' })}
          </span>{' '}
          <Link
            to="/login"
            className={
              'text-primary hover:text-primary-container hover:underline decoration-2 underline-offset-4 transition-all'
            }
          >
            {t('signup.signIn', {}, { defaultValue: 'Sign in instead' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn('space-y-5')} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            data-mol-id="signup-error"
            className={cm.cn(
              'px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm',
            )}
          >
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="name"
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('form.fullName', {}, { defaultValue: 'Full name' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
              aria-hidden="true"
            >
              person
            </span>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('signup.fullNamePlaceholder', {}, { defaultValue: 'Ada Lovelace' })}
              className={
                'w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
              }
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="email"
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="scholar@institution.edu"
              className={
                'w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
              }
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="password"
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              className={
                'w-full pl-12 pr-12 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              data-mol-id="toggle-password"
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={
                'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              <span className={cm.cn('material-symbols-outlined')}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          <p className={cm.cn('mt-2 text-xs text-on-surface-variant')}>
            {t(
              'signup.passwordHint',
              {},
              { defaultValue: 'Use 8+ characters with letters, numbers and symbols.' },
            )}
          </p>
        </div>
        <label className={cm.cn('flex items-start gap-3 cursor-pointer text-sm')}>
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className={
              'mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/40 border-outline-variant/30 bg-surface-container-low'
            }
          />
          <span className={cm.cn('text-on-surface-variant font-medium leading-snug')}>
            {t('signup.agreePrefix', {}, { defaultValue: 'I agree to the' })}{' '}
            <button
              type="button"
              onClick={openTerms}
              className={'text-primary font-bold hover:underline'}
            >
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </button>{' '}
            {t('signup.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              className={'text-primary font-bold hover:underline'}
            >
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </button>
            .
          </span>
        </label>
        <button
          type="submit"
          data-mol-id="btn-signup"
          disabled={loading}
          className={cm.cn(
            'w-full py-3.5 px-4 bg-primary-container text-on-primary font-bold rounded-xl shadow-[0px_8px_24px_rgba(99,54,224,0.25)] hover:bg-primary hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70',
          )}
        >
          {loading
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>
      <div className={cm.cn('mt-6')}>
        <OAuthButtons />
      </div>
      {modals}
    </AuthShell>
  )
}

export default Signup
