import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon } from '@molecule/app-ui-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/overview', { replace: true })
    } catch (_error) {
      // intentional noop — error state is managed by the signup hook
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
          <div className={cm.cn(cm.sp('mb', 6))}>
            <AuthBrandHeader />
          </div>
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
            {error && <div className={cm.authFormError}>{error.message}</div>}
          </form>
          <OAuthButtons />
        </div>
      </div>
      <Footer />
    </div>
  )
}
