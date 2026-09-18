<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePasswordReset, useLogin, useTranslation } from '@molecule/app-vue'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-vue'
import Icon from '../components/Icon.vue'
import FloatingInput from '../components/FloatingInput.vue'
import Footer from '../components/Footer.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const route = useRoute()
const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
const { login } = useLogin()

const token = ref((route.query.token as string) || '')
const email = ref((route.query.email as string) || '')
const password = ref('')
const twoFactorToken = ref('')

const isLoggingIn = computed(() => confirmStatus.value === 'pending')

async function handleSubmit() {
  try {
    await confirmReset({ token: token.value, password: password.value })
    await login({ email: email.value, password: password.value })
    router.replace('/')
  } catch {
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
            <img src="/logo.svg" :width="LOGO_SIZE" :height="LOGO_SIZE" alt="" :class="cm.logoIcon" />
            <span :class="cm.logoText">{{ APP_NAME }}</span>
          </Flex>
          <ThemeToggle />
        </Flex>
      </div>
    </header>
    <div :class="cm.authPageBody">
      <div :class="cm.authFormWrapper">
        <form @submit.prevent="handleSubmit">
          <div :class="cm.authField">
            <FloatingInput
              id="email"
              v-model="email"
              type="email"
              auto-complete="email"
              :auto-focus="!email"
              required
              :placeholder="t('auth.resetPassword.email')"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              id="token"
              v-model="token"
              type="password"
              :auto-focus="!!email && !token"
              required
              :placeholder="t('auth.resetPassword.token')"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              id="password"
              v-model="password"
              type="password"
              auto-complete="new-password"
              required
              :placeholder="t('auth.resetPassword.newPassword')"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              id="twoFactor"
              v-model="twoFactorToken"
              type="text"
              auto-complete="one-time-code"
              :placeholder="t('auth.resetPassword.twoFactor')"
            />
          </div>
          <div :class="cm.authButtonRow">
            <Button
              type="button"
              size="lg"
              color="secondary"
              :class="cm.authBackButton"
              :aria-label="t('common.goBack')"
              @click="router.push('/login')"
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
        <div v-if="confirmError" :class="cm.authFormError">
          {{ confirmError.message }}
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>
