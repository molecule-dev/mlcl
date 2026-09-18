import { createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { createSignup, useTranslate } from '@molecule/app-solid'
import { Button, Flex } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Signup() {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const { state: signupState, signup } = createSignup()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [name, setName] = createSignal('')

  const isSigningUp = () => signupState().status === 'pending'

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    try {
      await signup({ email: email(), password: password(), name: name() || undefined })
      navigate('/', { replace: true })
    } catch {
      // Error tracked in hook state
    }
  }

  return (
    <div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
      <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
        <div class={cm.authHeaderInner}>
          <Flex align="center" justify="between" className={cm.h('full')}>
            <Flex align="center" gap="xs">
              <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" class={cm.logoIcon} />
              <span class={cm.logoText}>{APP_NAME}</span>
            </Flex>
            <ThemeToggle />
          </Flex>
        </div>
      </header>
      <div class={cm.authPageBody}>
        <div class={cm.authFormWrapper}>
          <form onSubmit={handleSubmit}>
            <div class={cm.authField}>
              <FloatingInput
                id="email"
                type="email"
                value={email()}
                onInput={(e: InputEvent) =>
                  setEmail((e.currentTarget as HTMLInputElement).value)
                }
                autocomplete="email"
                autofocus
                required
                placeholder={t('auth.signup.email')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                id="password"
                type="password"
                value={password()}
                onInput={(e: InputEvent) =>
                  setPassword((e.currentTarget as HTMLInputElement).value)
                }
                autocomplete="new-password"
                required
                placeholder={t('auth.signup.password')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                id="name"
                type="text"
                value={name()}
                onInput={(e: InputEvent) =>
                  setName((e.currentTarget as HTMLInputElement).value)
                }
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
            <Show when={signupState().error}>
              <div class={cm.authFormError}>
                {(signupState().error as Error)?.message}
              </div>
            </Show>
          </form>
          <OAuthButtons />
        </div>
      </div>
      <Footer />
    </div>
  )
}
