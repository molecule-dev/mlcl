<script lang="ts">
  import { createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex } from '@molecule/app-ui-svelte'

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
  const { t } = createI18nStores()
</script>

<Flex align="center" gap="4px" className={cm.cn(cm.oauthDivider, className)}>
  <span class={cm.cn(cm.flex1, cm.separator())}></span>
  <span>{$t(labelKey, {}, { defaultValue: labelDefault })}</span>
  <span class={cm.cn(cm.flex1, cm.separator())}></span>
</Flex>
