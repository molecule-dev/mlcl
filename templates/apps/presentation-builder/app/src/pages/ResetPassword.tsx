import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon } from '@molecule/app-ui-react'

import { BrandWordmark } from '../components/BrandWordmark.js'
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
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success). The reset link's ?email= seeds it
  // and wins over any stored value; otherwise the email typed on Forgot
  // carries over.
  const urlEmail = searchParams.get('email') ?? undefined
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')

  const isLoggingIn = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/', { replace: true })
    } catch (_error) {
      // error is tracked in hook state via confirmReset/login; no additional handling needed
    }
  }

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
      <header className={cm.cn(cm.headerBar, cm.headerFixed)}>
        <div className={cm.authHeaderInner}>
          <Flex align="center" justify="between" className={cm.h('full')}>
            <Flex align="center" gap="xs">
              <BrandWordmark as="span" size="sm" />
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
          {confirmError && <div className={cm.authFormError}>{confirmError.message}</div>}
        </div>
      </div>
      <Footer />
    </div>
  )
}
