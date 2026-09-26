import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ClarionAuthShell } from '../components/ClarionAuthShell.js'

function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClarionAuthShell
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t(
        'signup.subheading',
        { appName: APP_NAME },
        {
          defaultValue: '14 days free. No credit card. Bring one CSV — {{appName}} does the rest.',
        },
      )}
      footer={
        <>
          {t('signup.haveAccount', {}, { defaultValue: 'Already have an account? ' })}
          <Link
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:text-primary-container transition-colors',
            )}
            to="/login"
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.stack(5)} onSubmit={handleSubmit}>
        <div>
          <label className={'sr-only'} htmlFor="email">
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <div className={'relative'}>
            <span
              className={cm.cn(
                'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none material-symbols-outlined text-on-surface-variant/60',
                cm.textSize('sm'),
              )}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              autoComplete="email"
              className={cm.cn(
                cm.w('full'),
                cm.sp('pl', 10),
                cm.sp('pr', 3),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'block bg-surface-container-high border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:outline-none transition-all',
              )}
              id="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
              required
              type="email"
              value={email}
            />
          </div>
        </div>

        <div>
          <label className={'sr-only'} htmlFor="password">
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div className={'relative'}>
            <span
              className={cm.cn(
                'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none material-symbols-outlined text-on-surface-variant/60',
                cm.textSize('sm'),
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              autoComplete="new-password"
              className={cm.cn(
                cm.w('full'),
                cm.sp('pl', 10),
                cm.sp('pr', 10),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'block bg-surface-container-high border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:outline-none transition-all',
              )}
              id="password"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
            />
            <button
              type="button"
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant/60 hover:text-primary transition-colors',
              )}
              onClick={() => setShowPassword((v) => !v)}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                aria-hidden="true"
              >
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <p
            data-mol-id="signup-error"
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-error')}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm',
          )}
        >
          {loading ? (
            <>
              <span
                className={cm.cn('material-symbols-outlined animate-spin', cm.textSize('base'))}
                aria-hidden="true"
              >
                progress_activity
              </span>
              {t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })}
            </>
          ) : (
            <>
              {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>
    </ClarionAuthShell>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
