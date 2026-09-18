import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NoshAuthShell } from '../components/NoshAuthShell.js'
import { NoshTextField } from '../components/NoshTextField.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/today'
  const { status, error, login } = useLogin()
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

  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Read values from the form directly so that programmatic submissions
    // (which may set DOM values without flushing React state) still work.
    const formData = new FormData(e.currentTarget)
    const submittedEmail = (formData.get('email') as string | null) ?? email
    const submittedPassword = (formData.get('password') as string | null) ?? password
    try {
      await login({ email: submittedEmail, password: submittedPassword })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state via useLogin
    }
  }

  return (
    <NoshAuthShell
      heading={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      subheading={t('nosh.login.subheading', {}, { defaultValue: 'Log in to keep going' })}
      footer={
        <>
          {t('nosh.login.signupPrompt', { app: APP_NAME }, { defaultValue: 'New to {{app}}?' })}{' '}
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline ml-1')}
          >
            {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <NoshTextField
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <NoshTextField
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          withPasswordToggle
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mt-1')}>
          <label className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'cursor-pointer group')}>
            <input
              type="checkbox"
              className={cm.cn('w-4 h-4 rounded-sm border-outline text-primary focus:ring-primary')}
            />
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant group-hover:text-on-surface transition-colors',
              )}
            >
              {t('nosh.login.rememberMe', {}, { defaultValue: 'Keep me signed in' })}
            </span>
          </label>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-primary hover:underline',
            )}
          >
            {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </Link>
        </div>

        {error ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-accent hover:bg-accent/90 text-on-accent rounded-lg shadow-sm shadow-orange-500/20 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>

        <OAuthButtons />
      </form>
    </NoshAuthShell>
  )
}
