import { createSignal, Show } from 'solid-js'
import { useNavigate, useLocation } from '@solidjs/router'
import { createLogin, useTranslate } from '@molecule/app-solid'
import { Button, Flex } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Login() {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/'
  const { state: loginState, login } = createLogin()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [twoFactorToken, setTwoFactorToken] = createSignal('')

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    try {
      await login({ email: email(), password: password() })
      navigate(from, { replace: true })
    } catch {
      // Error tracked in hook state
    }
  }

  const isLoggingIn = () => loginState().status === 'pending'

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
                placeholder={t('auth.login.email')}
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
                autocomplete="current-password"
                required
                placeholder={t('auth.login.password')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                id="twoFactor"
                type="text"
                value={twoFactorToken()}
                onInput={(e: InputEvent) =>
                  setTwoFactorToken((e.currentTarget as HTMLInputElement).value)
                }
                autocomplete="one-time-code"
                placeholder={t('auth.login.twoFactor')}
              />
            </div>
            <div class={cm.authButtonRow}>
              <Button
                type="button"
                size="lg"
                className={isLoggingIn() ? cm.authHidden : cm.authLoginSignup}
                disabled={isLoggingIn()}
                onClick={() => navigate('/signup')}
              >
                {t('auth.login.signUp')}
              </Button>
              <Button
                type="submit"
                size="lg"
                color="success"
                className={isLoggingIn() ? cm.authLoginSubmitFull : cm.authLoginSubmit}
                disabled={isLoggingIn()}
              >
                {isLoggingIn() ? t('auth.login.loggingIn') : t('auth.login.logIn')}
              </Button>
            </div>
            <Show when={loginState().error}>
              <div class={cm.authFormError}>
                {(loginState().error as Error)?.message}
              </div>
            </Show>
          </form>
          <div class={cm.authAfterSubmit}>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              class={cm.forgotPasswordLink}
            >
              {t('auth.login.forgotPassword')}
            </button>
          </div>
          <OAuthButtons />
        </div>
      </div>
      <Footer />
    </div>
  )
}
