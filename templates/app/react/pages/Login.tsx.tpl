import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useAuth, useLogin, useTranslation } from '@molecule/app-react'
import { Button, Flex } from '@molecule/app-ui-react'
import { getClassMap } from '@molecule/app-ui'
import { APP_NAME, LOGO_SIZE } from '../branding.js';
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const { status, error, login } = useLogin()
  const { isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')

  // Route into the app whenever a session exists — covers the OAuth callback
  // completing on this page (its exchange sets auth state without a submit)
  // and an already-authenticated user landing on /login directly.
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // The 2FA field is always rendered; only send a token when the user
      // typed one (a 2FA-enabled account gets `twoFactorRequired` back and
      // stays on this page until a valid code is entered).
      const result = await login({
        email,
        password,
        ...(twoFactorToken.trim() ? { twoFactorToken: twoFactorToken.trim() } : {}),
      })
      if (result.twoFactorRequired) return
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
              <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" className={cm.logoIcon} />
              <span className={cm.logoText}>{APP_NAME}</span>
            </Flex>
            <ThemeToggle />
          </Flex>
        </div>
      </header>
      <main className={cm.authPageBody}>
        {/* Screen-reader-only page heading — every page needs exactly one h1
            (axe page-has-heading-one); the visual design has no heading. */}
        <h1 className={cm.srOnly}>{t('auth.login.logIn')}</h1>
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
            {error && (
              <div className={cm.authFormError} role="alert">
                {error.message}
              </div>
            )}
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
      </main>
      <Footer />
    </div>
  )
}
