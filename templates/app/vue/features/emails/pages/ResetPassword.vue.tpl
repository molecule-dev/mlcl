<script setup lang="ts">
import { computed, ref } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-vue'
import { useLogin, usePasswordReset, useQuery, useRouter, useTranslation } from '@molecule/app-vue'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import Footer from '../components/Footer.vue'
import { Icon } from '../components/Icon.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const cm = getClassMap()
const { t } = useTranslation()
const { navigate } = useRouter()
const query = useQuery()
const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
const { login } = useLogin()

/** The first value of a query parameter, as react-router's searchParams.get did. */
const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '')

const token = ref(first(query.value.token))
const email = ref(first(query.value.email))
const password = ref('')
{{#feature two-factor}}
const twoFactorToken = ref('')
{{/feature}}

const isLoggingIn = computed(() => confirmStatus.value === 'pending')

async function handleSubmit(): Promise<void> {
  try {
    await confirmReset({ token: token.value, password: password.value })
{{#feature two-factor}}
    const result = await login({
      email: email.value,
      password: password.value,
      ...(twoFactorToken.value.trim() ? { twoFactorToken: twoFactorToken.value.trim() } : {}),
    })
    // An account with two-factor on and no code typed signs in on the login page, which asks for it.
    navigate(result.twoFactorRequired ? '/login' : '/', { replace: true })
{{/feature}}
{{^feature two-factor}}
    await login({ email: email.value, password: password.value })
    navigate('/', { replace: true })
{{/feature}}
  } catch (_error) {
    // Error tracked in hook state
  }
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
      <h1 :class="cm.srOnly">{{ t('auth.resetPassword.submit') }}</h1>
      <div :class="cm.authFormWrapper">
        <form @submit.prevent="handleSubmit">
          <div :class="cm.authField">
            <FloatingInput
              :value="email"
              type="email"
              autocomplete="email"
              required
              :placeholder="t('auth.resetPassword.email')"
              @change="email = ($event.target as HTMLInputElement).value"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              :value="token"
              type="password"
              required
              :placeholder="t('auth.resetPassword.token')"
              @change="token = ($event.target as HTMLInputElement).value"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              :value="password"
              type="password"
              autocomplete="new-password"
              required
              :placeholder="t('auth.resetPassword.newPassword')"
              @change="password = ($event.target as HTMLInputElement).value"
            />
          </div>
{{#feature two-factor}}
          <div :class="cm.authField">
            <FloatingInput
              :value="twoFactorToken"
              type="number"
              autocomplete="one-time-code"
              :placeholder="t('auth.resetPassword.twoFactor')"
              @change="twoFactorToken = ($event.target as HTMLInputElement).value"
            />
          </div>
{{/feature}}
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
              :disabled="isLoggingIn"
            >
              {{ isLoggingIn ? t('auth.resetPassword.loggingIn') : t('auth.resetPassword.submit') }}
            </Button>
          </div>
        </form>
        <div v-if="confirmError" role="alert" :class="cm.authFormError">
          {{ confirmError.message }}
        </div>
      </div>
    </main>
    <Footer />
  </div>
</template>
