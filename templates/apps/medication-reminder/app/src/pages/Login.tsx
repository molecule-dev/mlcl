import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
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
  const [twoFactorToken, setTwoFactorToken] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
      <header className={cm.cn(cm.headerBar, cm.headerFixed)}>
        <div className={cm.authHeaderInner}>
          <Flex align="center" justify="between" className={cm.h('full')}>
            <Flex align="center" gap="xs">
              <img
                src="/logo.svg"
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                alt=""
                className={cm.logoIcon}
              />
              <span className={cm.logoText}>{APP_NAME}</span>
            </Flex>
            <ThemeToggle />
          </Flex>
        </div>
      </header>
      <div className={cm.authPageBody}>
        <div className={cm.authFormWrapper}>
          <AuthBrandHeader />
          <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8))}>
            <div className={cm.authField}>
              <FloatingInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder={t('auth.login.email')}
              />
            </div>
            <div className={cm.authField}>
              <FloatingInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder={t('auth.login.password')}
              />
            </div>
            <div className={cm.authField}>
              <FloatingInput
                type="number"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                autoComplete="one-time-code"
                placeholder={t('auth.login.twoFactor')}
              />
            </div>
            <div className={cm.authButtonRow}>
              <Button
                type="button"
                size="lg"
                className={isLoggingIn ? cm.authHidden : cm.authLoginSignup}
                disabled={isLoggingIn}
                onClick={() => navigate('/signup')}
              >
                {t('auth.login.signUp')}
              </Button>
              <Button
                type="submit"
                size="lg"
                color="success"
                className={isLoggingIn ? cm.authLoginSubmitFull : cm.authLoginSubmit}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? t('auth.login.loggingIn') : t('auth.login.logIn')}
              </Button>
            </div>
            {error && <div className={cm.authFormError}>{error.message}</div>}
          </form>
          <div className={cm.authAfterSubmit}>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className={cm.forgotPasswordLink}
            >
              {t('auth.login.forgotPassword')}
            </button>
          </div>
          <OAuthButtons />
        </div>
      </div>
      <Footer />
    </div>
  )
}
