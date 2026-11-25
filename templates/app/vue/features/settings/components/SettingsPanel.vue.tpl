<script setup lang="ts">
import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
{{#feature billing}}
  TiersUpgradeSection,
{{/feature}}
} from '@molecule/app-settings-panel-vue'
import { getClassMap } from '@molecule/app-ui'
import { Separator } from '@molecule/app-ui-vue'
import { Link, useTranslation } from '@molecule/app-vue'

{{#feature footer}}
import Footer from './Footer.vue'
{{/feature}}

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
{{#feature two-factor}}
    <AuthSection />
{{/feature}}
{{^feature two-factor}}
    <AuthSection :two-factor="false" />
{{/feature}}
    <NotificationsSection />
{{#feature billing}}
    <TiersUpgradeSection />
{{/feature}}
    <DevicesSection />
    <ThisDeviceSection />
    <Separator />
    <LogOutDeleteSection />
{{#feature footer}}
    <Footer />
{{/feature}}
  </SettingsContainer>
</template>
