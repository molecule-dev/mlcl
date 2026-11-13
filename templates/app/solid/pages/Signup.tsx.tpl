import { useNavigate } from '@solidjs/router'
import { createEffect, createSignal, For, Show } from 'solid-js'

import { createAuth, createSignup, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-solid'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { formSubmitErrorMessages } from '../components/formSubmitError.js'
import { Icon } from '../components/Icon.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Signup() {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const { state: signupState, signup } = createSignup()
  const { isAuthenticated } = createAuth()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [name, setName] = createSignal('')
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
  // and an already-authenticated user landing on /signup directly.
  createEffect(() => {
    if (isAuthenticated()) navigate('/', { replace: true })
  })

  const isSigningUp = () => signupState().status === 'pending'

  const handleSubmit = async () => {
    setSubmitError(null)
    try {
      await signup({ email: email(), password: password(), name: name() || undefined })
      navigate('/', { replace: true })
    } catch (error) {
      setSubmitError(error)
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
        <h1 class={cm.srOnly}>{t('auth.signup.signUp')}</h1>
        <div class={cm.authFormWrapper}>
          <Form onFormSubmit={handleSubmit} submitting={isSigningUp()}>
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
          <OAuthButtons />
        </div>
      </main>
      <Footer />
    </div>
  )
}
