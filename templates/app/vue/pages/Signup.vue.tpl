<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-vue'
import { useAuth, useRouter, useSignup, useTranslation } from '@molecule/app-vue'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
{{#feature footer}}
import Footer from '../components/Footer.vue'
{{/feature}}
import { Icon } from '../components/Icon.js'
{{#feature oauth}}
import OAuthButtons from '../components/OAuthButtons.vue'
{{/feature}}
import { ThemeToggle } from '../components/ThemeToggle.js'

const cm = getClassMap()
const { t } = useTranslation()
const { navigate } = useRouter()
const { status, signup } = useSignup()
const { isAuthenticated } = useAuth()
const email = ref('')
const password = ref('')
const name = ref('')

const isSigningUp = computed(() => status.value === 'pending')

// Route into the app whenever a session exists — covers the OAuth callback
// completing on this page (its exchange sets auth state without a submit)
// and an already-authenticated user landing on /signup directly.
watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) navigate('/', { replace: true })
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  await signup({ email: email.value, password: password.value, name: name.value || undefined })
  navigate('/', { replace: true })
}
</script>

<template>
  <div :class="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
    <header :class="cm.cn(cm.headerBar, cm.headerFixed)">
      <div :class="cm.authHeaderInner">
        <Flex align="center" justify="between" :class="cm.h('full')">
          <Flex align="center" gap="xs">
            <img
              src="/logo.svg"
              :width="LOGO_SIZE"
              :height="LOGO_SIZE"
              alt=""
              :class="cm.logoIcon"
            />
            <span :class="cm.logoText">{{ APP_NAME }}</span>
          </Flex>
          <ThemeToggle />
        </Flex>
      </div>
    </header>
    <main :class="cm.authPageBody">
      <!-- Screen-reader-only page heading — every page needs exactly one h1
          (axe page-has-heading-one); the visual design has no heading. -->
      <h1 :class="cm.srOnly">{{ t('auth.signup.signUp') }}</h1>
      <div :class="cm.authFormWrapper">
        <!-- A rejected submit renders an accessible server-error list and a new
            submit clears the previous failure; the fieldset is disabled while
            the handler runs (all of that is the shared Form's job). -->
        <Form @form-submit="handleSubmit">
          <div :class="cm.authField">
            <FloatingInput
              :value="email"
              type="email"
              autocomplete="email"
              required
              :placeholder="t('auth.signup.email')"
              @change="email = ($event.target as HTMLInputElement).value"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              :value="password"
              type="password"
              autocomplete="new-password"
              required
              :placeholder="t('auth.signup.password')"
              @change="password = ($event.target as HTMLInputElement).value"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              :value="name"
              type="text"
              autocomplete="name"
              :placeholder="t('auth.signup.name')"
              @change="name = ($event.target as HTMLInputElement).value"
            />
          </div>
          <div :class="cm.authButtonRow">
            <Button
              type="button"
              size="lg"
              color="secondary"
              :class="cm.authBackButton"
              :aria-label="t('common.goBack')"
              @click="navigate('/login')"
            >
              <Icon name="arrow-left" :size="25" />
            </Button>
            <Button
              type="submit"
              size="lg"
              color="success"
              :class="cm.authSubmitButton"
              :disabled="isSigningUp"
            >
              {{ isSigningUp ? t('auth.signup.signingUp') : t('auth.signup.signUp') }}
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
</template>
