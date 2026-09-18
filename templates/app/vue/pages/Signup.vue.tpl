<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSignup, useTranslation } from '@molecule/app-vue'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-vue'
import Icon from '../components/Icon.vue'
import FloatingInput from '../components/FloatingInput.vue'
import OAuthButtons from '../components/OAuthButtons.vue'
import Footer from '../components/Footer.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const { status, error, signup } = useSignup()
const email = ref('')
const password = ref('')
const name = ref('')

const isSigningUp = computed(() => status.value === 'pending')

async function handleSubmit() {
  try {
    await signup({ email: email.value, password: password.value, name: name.value || undefined })
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
              auto-focus
              required
              :placeholder="t('auth.signup.email')"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              id="password"
              v-model="password"
              type="password"
              auto-complete="new-password"
              required
              :placeholder="t('auth.signup.password')"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              id="name"
              v-model="name"
              type="text"
              auto-complete="name"
              :placeholder="t('auth.signup.name')"
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
              :disabled="isSigningUp"
            >
              {{ isSigningUp ? t('auth.signup.signingUp') : t('auth.signup.signUp') }}
            </Button>
          </div>
          <div v-if="error" :class="cm.authFormError">
            {{ error.message }}
          </div>
        </form>
        <OAuthButtons />
      </div>
    </div>
    <Footer />
  </div>
</template>
