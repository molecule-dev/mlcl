import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { usePasswordReset, useLogin, useTranslation } from '@molecule/app-react'
import { Button, Flex } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js';
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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
  const [twoFactorToken, setTwoFactorToken] = useState('')

  const isLoggingIn = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      navigate('/', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

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
            <div className={cm.authField}>
              <FloatingInput
                type="number"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                autoComplete="one-time-code"
                placeholder={t('auth.resetPassword.twoFactor')}
              />
            </div>
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
            <div className={cm.authFormError}>
              {confirmError.message}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
