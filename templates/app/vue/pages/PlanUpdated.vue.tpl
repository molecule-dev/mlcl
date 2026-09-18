<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { useAuth, useTranslation } from '@molecule/app-vue'
import { Button, Flex, Spinner, Container } from '@molecule/app-ui-vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

const { t } = useTranslation()
const cm = getClassMap()
const { state } = useAuth()
</script>

<template>
  <div :class="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
    <header :class="cm.headerBar">
      <Container max-width="xl" :class="cm.h(16)">
        <Flex align="center" justify="between" :class="cm.h('full')">
          <Flex align="center" gap="sm" :class="cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))">
            <img src="/logo.svg" :width="LOGO_SIZE" :height="LOGO_SIZE" alt="" />
            {{ APP_NAME }}
          </Flex>
          <ThemeToggle />
        </Flex>
      </Container>
    </header>
    <Flex v-if="!state.initialized" align="center" justify="center" :class="cm.flex1">
      <Spinner />
    </Flex>
    <Flex v-else align="center" justify="center" :class="cm.flex1">
      <div :class="cm.textCenter">
        <h2 :class="cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))">{{ t('planUpdated.message') }}</h2>
        <h2 :class="cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))">{{ t('planUpdated.thankYou') }}</h2>
        <RouterLink to="/">
          <Button>{{ t('planUpdated.returnHome') }}</Button>
        </RouterLink>
      </div>
    </Flex>
  </div>
</template>
