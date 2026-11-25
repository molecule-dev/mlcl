import { useNavigate } from '@solidjs/router'
import { createEffect, createSignal } from 'solid-js'

import { useAuth, useSignup, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-solid'

import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
{{#feature oauth}}
import { OAuthButtons } from '../components/OAuthButtons.js'
{{/feature}}
{{#feature footer}}
import { Footer } from '../components/Footer.js'
{{/feature}}
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, signup } = useSignup()
  const { isAuthenticated } = useAuth()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [name, setName] = createSignal('')

  // Route into the app whenever a session exists — covers the OAuth callback
  // completing on this page (its exchange sets auth state without a submit)
  // and an already-authenticated user landing on /signup directly.
  createEffect(() => {
    if (isAuthenticated()) navigate('/', { replace: true })
  })

  const isSigningUp = (): boolean => status() === 'pending'

  const handleSubmit = async () => {
    await signup({ email: email(), password: password(), name: name() || undefined })
    navigate('/', { replace: true })
  }

  return (
    <div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
      <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
        <div class={cm.authHeaderInner}>
          <Flex align="center" justify="between" className={cm.h('full')}>
            <Flex align="center" gap="xs">
              <img
                src="/logo.svg"
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                alt=""
                class={cm.logoIcon}
              />
              <span class={cm.logoText}>{APP_NAME}</span>
            </Flex>
            <ThemeToggle />
          </Flex>
        </div>
      </header>
      <main class={cm.authPageBody}>
        {/* Screen-reader-only page heading — every page needs exactly one h1
            (axe page-has-heading-one); the visual design has no heading. */}
        <h1 class={cm.srOnly}>{t('auth.signup.signUp')}</h1>
        <div class={cm.authFormWrapper}>
          {/* A rejected signup renders the failure list inside the shared `Form`;
              a new submit clears it. */}
          <Form onFormSubmit={handleSubmit}>
            <div class={cm.authField}>
              <FloatingInput
                type="email"
                value={email()}
                onChange={(e: Event) => setEmail((e.target as HTMLInputElement).value)}
                autocomplete="email"
                required
                placeholder={t('auth.signup.email')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                type="password"
                value={password()}
                onChange={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
                autocomplete="new-password"
                required
                placeholder={t('auth.signup.password')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                type="text"
                value={name()}
                onChange={(e: Event) => setName((e.target as HTMLInputElement).value)}
                autocomplete="name"
                placeholder={t('auth.signup.name')}
              />
            </div>
            <div class={cm.authButtonRow}>
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
                disabled={isSigningUp()}
              >
                {isSigningUp() ? t('auth.signup.signingUp') : t('auth.signup.signUp')}
              </Button>
            </div>
          </Form>
{{#feature oauth}}
          <OAuthButtons />
{{/feature}}
        </div>
      </main>
{{#feature footer}}
      <Footer />
{{/feature}}
    </div>
  )
}
