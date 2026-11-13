<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { Separator } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import Footer from './Footer.vue'
import AccountSection from './settings-panel/AccountSection.vue'
import AuthSection from './settings-panel/AuthSection.vue'
import BillingSection from './settings-panel/BillingSection.vue'
import DevicesSection from './settings-panel/DevicesSection.vue'
import LogOutDeleteSection from './settings-panel/LogOutDeleteSection.vue'
import NotificationsSection from './settings-panel/NotificationsSection.vue'
import SettingsContainer from './settings-panel/SettingsContainer.vue'
import ThisDeviceSection from './settings-panel/ThisDeviceSection.vue'

const { t } = useTranslation()
const cm = getClassMap()

const emit = defineEmits<{ close: [] }>()

function close(): void {
  emit('close')
}
</script>

<template>
  <SettingsContainer :on-close="close">
    <!-- The full profile page: the drawer's sections update one field at a time, while
        `/settings` edits the whole profile as one native form (and is where the app's
        own profile fields belong). Close the drawer first so navigation is not hidden. -->
    <RouterLink
      to="/settings"
      :class="cm.cn(cm.button({ variant: 'outline' }), cm.sp('mb', 3))"
      data-mol-id="settings-page-link"
      @click="close"
    >
      {{ t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' }) }}
    </RouterLink>
    <AccountSection />
    <AuthSection />
    <NotificationsSection />
    <BillingSection />
    <DevicesSection />
    <ThisDeviceSection />
    <Separator />
    <LogOutDeleteSection />
    <Footer />
  </SettingsContainer>
</template>
