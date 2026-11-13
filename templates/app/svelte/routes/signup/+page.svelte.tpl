<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  import { createAuthStores, createSignupStore } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Button from '../../components/Button.svelte'
  import Flex from '../../components/Flex.svelte'
  import FloatingInput from '../../components/FloatingInput.svelte'
  import Footer from '../../components/Footer.svelte'
  import Form from '../../components/Form.svelte'
  import Icon from '../../components/Icon.svelte'
  import OAuthButtons from '../../components/OAuthButtons.svelte'
  import ThemeToggle from '../../components/ThemeToggle.svelte'
  import { createAppI18nStores } from '../../lib/i18n.js'
  import { LOGO_SRC } from '../../lib/logo.js'

  const cm = getClassMap()
  const { t } = createAppI18nStores()
  const signupStore = createSignupStore()
  const { isAuthenticated } = createAuthStores()

  let email = $state('')
  let password = $state('')
  let name = $state('')

  // Route into the app whenever a session exists — covers the OAuth callback
  // completing on this page (its exchange sets auth state without a submit)
  // and an already-authenticated user landing on /signup directly.
  $effect(() => {
    if ($isAuthenticated) goto(resolve('/'), { replaceState: true })
  })

  let isSigningUp = $derived($signupStore.status === 'pending')

  async function handleSubmit(): Promise<void> {
    await signupStore.call({ email, password, name: name || undefined })
    goto(resolve('/'), { replaceState: true })
  }
</script>

<div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
  <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
    <div class={cm.authHeaderInner}>
      <Flex align="center" justify="between" class={cm.h('full')}>
        <Flex align="center" gap="xs">
          <img src={LOGO_SRC} width={LOGO_SIZE} height={LOGO_SIZE} alt="" class={cm.logoIcon} />
          <span class={cm.logoText}>{APP_NAME}</span>
        </Flex>
        <ThemeToggle />
      </Flex>
    </div>
  </header>
  <main class={cm.authPageBody}>
    <!-- Screen-reader-only page heading — every page needs exactly one h1
        (axe page-has-heading-one); the visual design has no heading. -->
    <h1 class={cm.srOnly}>{$t('auth.signup.signUp')}</h1>
    <div class={cm.authFormWrapper}>
      <Form onFormSubmit={handleSubmit}>
        <div class={cm.authField}>
          <FloatingInput
            type="email"
            bind:value={email}
            autocomplete="email"
            required
            placeholder={$t('auth.signup.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            bind:value={password}
            autocomplete="new-password"
            required
            placeholder={$t('auth.signup.password')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="text"
            bind:value={name}
            autocomplete="name"
            placeholder={$t('auth.signup.name')}
          />
        </div>
        <div class={cm.authButtonRow}>
          <Button
            type="button"
            size="lg"
            color="secondary"
            class={cm.authBackButton}
            onclick={() => goto(resolve('/login'))}
            aria-label={$t('common.goBack')}
          >
            <Icon name="arrow-left" size={25} />
          </Button>
          <Button
            type="submit"
            size="lg"
            color="success"
            class={cm.authSubmitButton}
            disabled={isSigningUp}
          >
            {isSigningUp ? $t('auth.signup.signingUp') : $t('auth.signup.signUp')}
          </Button>
        </div>
      </Form>
      <OAuthButtons />
    </div>
  </main>
  <Footer />
</div>
