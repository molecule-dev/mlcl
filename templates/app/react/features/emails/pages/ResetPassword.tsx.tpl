import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { usePasswordReset, useLogin, useTranslation } from '@molecule/app-react'
import { Button } from '@molecule/app-ui-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { FloatingInput } from '../components/FloatingInput.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
{{#feature two-factor}}
  const [twoFactorToken, setTwoFactorToken] = useState('')
{{/feature}}

  const isLoggingIn = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
{{#feature two-factor}}
      const result = await login({
        email,
        password,
        ...(twoFactorToken.trim() ? { twoFactorToken: twoFactorToken.trim() } : {}),
      })
      // An account with two-factor on and no code typed signs in on the login page, which asks for it.
      navigate(result.twoFactorRequired ? '/login' : '/', { replace: true })
{{/feature}}
{{^feature two-factor}}
      await login({ email, password })
      navigate('/', { replace: true })
{{/feature}}
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <section className={cm.authPageBody}>
      {/* Screen-reader-only page heading — every page needs exactly one h1
            (axe page-has-heading-one); the visual design has no heading. */}
      <h1 className={cm.srOnly}>{t('auth.resetPassword.submit')}</h1>
      <div className={cm.authFormWrapper}>
        <form onSubmit={handleSubmit}>
          <div className={cm.authField}>
            <FloatingInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder={t('auth.resetPassword.email')}
            />
          </div>
          <div className={cm.authField}>
            <FloatingInput
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder={t('auth.resetPassword.token')}
            />
          </div>
          <div className={cm.authField}>
            <FloatingInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              placeholder={t('auth.resetPassword.newPassword')}
            />
          </div>
{{#feature two-factor}}
          <div className={cm.authField}>
            <FloatingInput
              type="number"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value)}
              autoComplete="one-time-code"
              placeholder={t('auth.resetPassword.twoFactor')}
            />
          </div>
{{/feature}}
          <div className={cm.authButtonRow}>
            <Button
              type="button"
              size="lg"
              color="secondary"
              className={cm.authBackButton}
              onClick={() => navigate('/login')}
              aria-label={t('common.goBack')}
            >
              <Icon name="arrow-left" size={25} />
            </Button>
            <Button
              type="submit"
              size="lg"
              color="success"
              className={cm.authSubmitButton}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? t('auth.resetPassword.loggingIn') : t('auth.resetPassword.submit')}
            </Button>
          </div>
        </form>
        {confirmError && (
          <div className={cm.authFormError} role="alert">
            {confirmError.message}
          </div>
        )}
      </div>
    </section>
  )
}
