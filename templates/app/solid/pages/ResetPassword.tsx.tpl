import { useNavigate, useSearchParams } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { createLogin, createPasswordReset, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-solid'
import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function ResetPassword() {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmState, confirmReset } = createPasswordReset()
  const { login } = createLogin()

  const param = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ''
  const [token, setToken] = createSignal(param(searchParams.token))
  const [email, setEmail] = createSignal(param(searchParams.email))
  const [password, setPassword] = createSignal('')
  const [twoFactorToken, setTwoFactorToken] = createSignal('')

  const isLoggingIn = () => confirmState().status === 'pending'

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    try {
      await confirmReset({ token: token(), password: password() })
      await login({ email: email(), password: password() })
      navigate('/', { replace: true })
    } catch (_error) {
      // Error tracked in hook state (confirmState().error)
    }
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
        <h1 class={cm.srOnly}>{t('auth.resetPassword.submit')}</h1>
        <div class={cm.authFormWrapper}>
          <form onSubmit={handleSubmit}>
            <div class={cm.authField}>
              <FloatingInput
                type="email"
                value={email()}
                onChange={(e: Event) => setEmail((e.target as HTMLInputElement).value)}
                autocomplete="email"
                required
                placeholder={t('auth.resetPassword.email')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                type="password"
                value={token()}
                onChange={(e: Event) => setToken((e.target as HTMLInputElement).value)}
                required
                placeholder={t('auth.resetPassword.token')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                type="password"
                value={password()}
                onChange={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
                autocomplete="new-password"
                required
                placeholder={t('auth.resetPassword.newPassword')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                type="number"
                value={twoFactorToken()}
                onChange={(e: Event) => setTwoFactorToken((e.target as HTMLInputElement).value)}
                autocomplete="one-time-code"
                placeholder={t('auth.resetPassword.twoFactor')}
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
                disabled={isLoggingIn()}
              >
                {isLoggingIn() ? t('auth.resetPassword.loggingIn') : t('auth.resetPassword.submit')}
              </Button>
            </div>
          </form>
          <Show when={confirmState().error}>
            <div class={cm.authFormError} role="alert">
              {(confirmState().error as Error)?.message}
            </div>
          </Show>
        </div>
      </main>
      <Footer />
    </div>
  )
}
