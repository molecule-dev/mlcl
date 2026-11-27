import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useLogin, useTranslation } from '@molecule/app-react'
import { Button as SubmitButton } from '@molecule/app-ui-react'
import { Button, Flex } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
{{#feature oauth}}
import { OAuthButtons } from '../components/OAuthButtons.js'
{{/feature}}
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const { status, error, login } = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
{{#feature two-factor}}
  const [twoFactorToken, setTwoFactorToken] = useState('')
{{/feature}}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
{{#feature two-factor}}
      // Only send a code the user typed; an account with two-factor on gets
      // `twoFactorRequired` back and stays on this page until a valid code is entered.
      const result = await login({
        email,
        password,
        ...(twoFactorToken.trim() ? { twoFactorToken: twoFactorToken.trim() } : {}),
      })
      if (result.twoFactorRequired) return
      navigate(from, { replace: true })
{{/feature}}
{{^feature two-factor}}
      await login({ email, password })
      navigate(from, { replace: true })
{{/feature}}
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
          <form onSubmit={handleSubmit}>
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
{{#feature two-factor}}
            <div className={cm.authField}>
              <FloatingInput
                type="number"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                autoComplete="one-time-code"
                placeholder={t('auth.login.twoFactor')}
              />
            </div>
{{/feature}}
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
              <SubmitButton
                type="submit"
                size="lg"
                color="success"
                className={isLoggingIn ? cm.authLoginSubmitFull : cm.authLoginSubmit}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? t('auth.login.loggingIn') : t('auth.login.logIn')}
              </SubmitButton>
            </div>
            {error && <div className={cm.authFormError}>{error.message}</div>}
          </form>
{{#feature emails}}
          <div className={cm.authAfterSubmit}>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className={cm.forgotPasswordLink}
            >
              {t('auth.login.forgotPassword')}
            </button>
          </div>
{{/feature}}
{{#feature oauth}}
          <OAuthButtons />
{{/feature}}
        </div>
      </div>
      <Footer />
    </div>
  )
}
