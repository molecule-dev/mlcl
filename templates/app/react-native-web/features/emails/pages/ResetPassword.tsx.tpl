import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { usePasswordReset, useLogin, useTranslation } from '@molecule/app-react'
import { Button, Flex, FormArea } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
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
{{#feature two-factor}}
  const [twoFactorToken, setTwoFactorToken] = useState('')
{{/feature}}

  const isLoggingIn = confirmStatus === 'pending'

  const handleSubmit = async () => {
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
          <FormArea as="form" onSubmit={handleSubmit}>
            <div className={cm.authField}>
              <FloatingInput
                type="email"
                name="email"
                value={email}
                onValueChange={setEmail}
                autoComplete="email"
                required
                placeholder={t('auth.resetPassword.email')}
              />
            </div>
            <div className={cm.authField}>
              <FloatingInput
                type="password"
                name="token"
                value={token}
                onValueChange={setToken}
                required
                placeholder={t('auth.resetPassword.token')}
              />
            </div>
            <div className={cm.authField}>
              <FloatingInput
                type="password"
                name="password"
                value={password}
                onValueChange={setPassword}
                autoComplete="new-password"
                required
                placeholder={t('auth.resetPassword.newPassword')}
              />
            </div>
{{#feature two-factor}}
            <div className={cm.authField}>
              <FloatingInput
                type="number"
                name="twoFactorToken"
                value={twoFactorToken}
                onValueChange={setTwoFactorToken}
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
          </FormArea>
          {confirmError && <div className={cm.authFormError}>{confirmError.message}</div>}
        </div>
      </div>
      <Footer />
    </div>
  )
}
