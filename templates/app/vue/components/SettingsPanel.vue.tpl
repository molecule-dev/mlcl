<script setup lang="ts">
import {
  AccountSection,
  AuthSection,
  BillingSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-vue'
import { getClassMap } from '@molecule/app-ui'
import { Separator } from '@molecule/app-ui-vue'
import { Link, useTranslation } from '@molecule/app-vue'

import Footer from './Footer.vue'

const props = defineProps<{ onClose: () => void }>()
const cm = getClassMap()
const { t } = useTranslation()
</script>

<template>
  <SettingsContainer :on-close="props.onClose">
    <!-- The full profile page: the drawer's sections update one field at a time, while
        `/settings` edits the whole profile as one native form (and is where the app's
        own profile fields belong). Close the drawer first so navigation is not hidden. -->
    <Link
      to="/settings"
      :class="cm.cn(cm.button({ variant: 'outline' }), cm.sp('mb', 3))"
      data-mol-id="settings-page-link"
      @click="props.onClose"
    >
      {{ t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' }) }}
    </Link>
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
