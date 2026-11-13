<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { createAppI18nStores } from '../lib/i18n.js'
  import Flex from './Flex.svelte'

  /**
   * The "or continue with" rule above an OAuth row: a horizontal rule with
   * centered label text, shown between a login/signup form and the OAuth
   * button row.
   */
  let {
    labelKey = 'oauth.orContinueWith',
    labelDefault = 'or continue with',
    class: className = undefined,
  }: {
    labelKey?: string
    labelDefault?: string
    class?: string
  } = $props()

  const cm = getClassMap()
  const { t } = createAppI18nStores()
</script>

<Flex align="center" style="gap: 4px;" class={cm.cn(cm.oauthDivider, className)}>
  <span class={cm.cn(cm.flex1, cm.separator())}></span>
  <span>{$t(labelKey, {}, { defaultValue: labelDefault })}</span>
  <span class={cm.cn(cm.flex1, cm.separator())}></span>
</Flex>
