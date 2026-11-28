import { useState } from 'react'
import { useNavigate } from 'react-router'
import { serverErrorMessage } from '@molecule/app-http'
import { useSignup, useTranslation } from '@molecule/app-react'
import { Button, Flex, FormArea } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
{{#feature oauth}}
import { OAuthButtons } from '../components/OAuthButtons.js'
{{/feature}}
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

  const handleSubmit = async () => {
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
                placeholder={t('auth.signup.email')}
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
                placeholder={t('auth.signup.password')}
              />
            </div>
            <div className={cm.authField}>
              <FloatingInput
                type="text"
                name="name"
                value={name}
                onValueChange={setName}
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
                {serverErrorMessage(error) ??
                  t('auth.error.registrationFailed', {}, { defaultValue: 'Registration failed' })}
              </div>
            )}
          </FormArea>
{{#feature oauth}}
          <OAuthButtons />
{{/feature}}
        </div>
      </div>
      <Footer />
    </div>
  )
}
