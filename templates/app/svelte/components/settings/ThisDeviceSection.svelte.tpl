<script lang="ts">
  import { createDeviceStores, createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex } from '@molecule/app-ui-svelte'

  // "This device" detail strip — OS, browser, online/offline.
  // Reads from the device provider + browser `navigator.onLine`.
  // No side effects, no app-specific state.

  const cm = getClassMap()
  const { t } = createI18nStores()
  const { deviceInfo } = createDeviceStores()
</script>

<section>
  <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{$t('settings.thisDevice')}</h3>
  <dl class={cm.cn(cm.stack(1), cm.textSize('sm'))}>
    <Flex justify="between">
      <dt class={cm.textMuted}>{$t('settings.platform')}</dt>
      <dd>{deviceInfo.os.name || $t('settings.unknown')}</dd>
    </Flex>
    <Flex justify="between">
      <dt class={cm.textMuted}>{$t('settings.browser')}</dt>
      <dd>{deviceInfo.browser.name || $t('settings.unknown')}</dd>
    </Flex>
    <Flex justify="between">
      <dt class={cm.textMuted}>{$t('settings.network')}</dt>
      <dd>{navigator.onLine ? $t('settings.online') : $t('settings.offline')}</dd>
    </Flex>
  </dl>
</section>
