import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSignup, useTranslation } from '@molecule/app-react'
import { Button, Flex } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js';
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
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
                placeholder={t('auth.signup.email')}
              />
            </div>
            <div className={cm.authField}>
              <FloatingInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                placeholder={t('auth.signup.password')}
              />
            </div>
            <div className={cm.authField}>
              <FloatingInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder={t('auth.signup.name')}
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
                disabled={isSigningUp}
              >
                {isSigningUp ? t('auth.signup.signingUp') : t('auth.signup.signUp')}
              </Button>
            </div>
            {error && (
              <div className={cm.authFormError}>
                {error.message}
              </div>
            )}
          </form>
          <OAuthButtons />
        </div>
      </div>
      <Footer />
    </div>
  )
}
