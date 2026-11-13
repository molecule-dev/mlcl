import { useLocation, useNavigate } from '@solidjs/router'
import { createEffect, createSignal, For, Show } from 'solid-js'

import { createAuth, createLogin, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-solid'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { formSubmitErrorMessages } from '../components/formSubmitError.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Login() {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/'
  const { state: loginState, login } = createLogin()
  const { isAuthenticated } = createAuth()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [twoFactorToken, setTwoFactorToken] = createSignal('')
  // The failure the last submit threw (the React reference's `Form` renders
  // its own rejection list; this scaffold's `Form` passes the handler result
  // through, so the list is rendered here).
  const [submitError, setSubmitError] = createSignal<unknown>(null)
  const submitMessages = () =>
    formSubmitErrorMessages(
      submitError(),
      t('ui.form.submitError', undefined, { defaultValue: 'Unable to submit. Please try again.' }),
    )

  // Route into the app whenever a session exists — covers the OAuth callback
  // completing on this page (its exchange sets auth state without a submit)
  // and an already-authenticated user landing on /login directly.
  createEffect(() => {
    if (isAuthenticated()) navigate(from, { replace: true })
  })

  const handleSubmit = async () => {
    setSubmitError(null)
    // The 2FA field is always rendered; only send a token when the user
    // typed one (a 2FA-enabled account gets `twoFactorRequired` back and
    // stays on this page until a valid code is entered).
    try {
      const token = twoFactorToken().trim()
      const result = await login({
        email: email(),
        password: password(),
        ...(token ? { twoFactorToken: token } : {}),
      })
      if (result.twoFactorRequired) return
      navigate(from, { replace: true })
    } catch (error) {
      setSubmitError(error)
    }
  }

  const isLoggingIn = () => loginState().status === 'pending'

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
        <h1 class={cm.srOnly}>{t('auth.login.logIn')}</h1>
        <div class={cm.authFormWrapper}>
          <Form onFormSubmit={handleSubmit} submitting={isLoggingIn()}>
            <Show when={submitError()}>
              <ul role="alert" class={cm.formError}>
                <For each={submitMessages()}>{(message) => <li>{message}</li>}</For>
              </ul>
            </Show>
            <div class={cm.authField}>
              <FloatingInput
                type="email"
                value={email()}
                onChange={(e: Event) => setEmail((e.target as HTMLInputElement).value)}
                autocomplete="email"
                required
                placeholder={t('auth.login.email')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                type="password"
                value={password()}
                onChange={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
                autocomplete="current-password"
                required
                placeholder={t('auth.login.password')}
              />
            </div>
            <div class={cm.authField}>
              <FloatingInput
                type="number"
                value={twoFactorToken()}
                onChange={(e: Event) => setTwoFactorToken((e.target as HTMLInputElement).value)}
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
          </Form>
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
      </main>
      <Footer />
    </div>
  )
}
