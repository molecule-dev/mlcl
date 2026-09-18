<script setup lang="ts">
import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { useAuth, useTranslation } from '@molecule/app-vue'

const { t } = useTranslation()
const cm = getClassMap()
const { user } = useAuth<UserProfile>()
</script>

<template>
  <div :class="cm.cn(cm.textCenter, cm.sp('py', 12))">
    <h2 :class="cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))">
      {{ t('home.greeting') }}{{ user?.name || user?.email || t('home.world') }}!
    </h2>
  </div>
</template>
