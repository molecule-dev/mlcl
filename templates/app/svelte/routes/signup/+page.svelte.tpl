<script lang="ts">
  import { APP_NAME, LOGO_SIZE } from '#lib/branding.js'

  import { useAuth, useNavigate, useSignup, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, FloatingInput, Form, Icon, ThemeToggle } from '@molecule/app-ui-svelte'

{{#feature footer}}
  import Footer from '../../components/Footer.svelte'
{{/feature}}
{{#feature oauth}}
  import OAuthButtons from '../../components/OAuthButtons.svelte'
{{/feature}}
  import { LOGO_SRC } from '../../lib/logo.js'

  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, signup } = useSignup()
  const { isAuthenticated } = useAuth()

  let email = $state('')
  let password = $state('')
  let name = $state('')

  // Route into the app whenever a session exists — covers the OAuth callback
  // completing on this page (its exchange sets auth state without a submit)
  // and an already-authenticated user landing on /signup directly.
  $effect(() => {
    if ($isAuthenticated) navigate('/', { replace: true })
  })

  const isSigningUp = $derived($status === 'pending')

  async function handleSubmit(): Promise<void> {
    await signup({ email, password, name: name || undefined })
    navigate('/', { replace: true })
  }
</script>

<div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
  <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
    <div class={cm.authHeaderInner}>
      <Flex align="center" justify="between" className={cm.h('full')}>
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
    <h1 class={cm.srOnly}>{t('auth.signup.signUp')}</h1>
    <div class={cm.authFormWrapper}>
      <Form onFormSubmit={handleSubmit}>
        <div class={cm.authField}>
          <FloatingInput
            type="email"
            value={email}
            onChange={(e) => (email = (e.target as HTMLInputElement).value)}
            autocomplete="email"
            required
            placeholder={t('auth.signup.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            value={password}
            onChange={(e) => (password = (e.target as HTMLInputElement).value)}
            autocomplete="new-password"
            required
            placeholder={t('auth.signup.password')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="text"
            value={name}
            onChange={(e) => (name = (e.target as HTMLInputElement).value)}
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
            disabled={isSigningUp}
          >
            {isSigningUp ? t('auth.signup.signingUp') : t('auth.signup.signUp')}
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
