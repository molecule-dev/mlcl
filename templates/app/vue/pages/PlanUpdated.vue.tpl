<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-vue'
import { useAuth, useTranslation } from '@molecule/app-vue'

const { t } = useTranslation()
const cm = getClassMap()
const { state } = useAuth()
</script>

<template>
  <Flex v-if="!state.initialized" align="center" justify="center" :class="cm.sp('py', 12)">
    <Spinner />
  </Flex>
  <div v-else :class="cm.cn(cm.textCenter, cm.sp('py', 12))">
    <h1 :class="cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))">
      {{ t('planUpdated.message') }}
    </h1>
    <h2 :class="cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))">
      {{ t('planUpdated.thankYou') }}
    </h2>
    <RouterLink to="/">
      <Button>{{ t('planUpdated.returnHome') }}</Button>
    </RouterLink>
  </div>
</template>
