<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-vue'
import { useDevice, useTranslation } from '@molecule/app-vue'

/**
 * "This device" detail strip — OS, browser, online/offline.
 *
 * Reads from `@molecule/app-device` (useDevice composable) + browser
 * `navigator.onLine`. No side effects, no app-specific state.
 */
const { t } = useTranslation()
const cm = getClassMap()
const { deviceInfo } = useDevice()
const navigatorOnLine = navigator.onLine
</script>

<template>
  <section>
    <h3 :class="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">{{ t('settings.thisDevice') }}</h3>
    <dl :class="cm.cn(cm.stack(1), cm.textSize('sm'))">
      <Flex justify="between">
        <dt :class="cm.textMuted">{{ t('settings.platform') }}</dt>
        <dd>{{ deviceInfo.os.name || t('settings.unknown') }}</dd>
      </Flex>
      <Flex justify="between">
        <dt :class="cm.textMuted">{{ t('settings.browser') }}</dt>
        <dd>{{ deviceInfo.browser.name || t('settings.unknown') }}</dd>
      </Flex>
      <Flex justify="between">
        <dt :class="cm.textMuted">{{ t('settings.network') }}</dt>
        <dd>{{ navigatorOnLine ? t('settings.online') : t('settings.offline') }}</dd>
      </Flex>
    </dl>
  </section>
</template>
