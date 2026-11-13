<script lang="ts">
  import { page } from '$app/stores'
  import type { Snippet } from 'svelte'

  import type { IconName } from '@molecule/app-icons'
  import { getClassMap } from '@molecule/app-ui'

  import { createAppI18nStores } from '../lib/i18n.js'
  import { setPanelCloseContext } from '../lib/panel-close.js'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let {
    children,
    ariaLabelKey = 'userMenu.open',
    ariaLabelDefault = 'Open user menu',
    triggerIcon = 'user' as IconName,
    triggerIconSize = 20,
    dataMolId = 'user-menu',
    class: className = undefined,
    disabled = false,
    onclick = undefined,
    side = 'right',
  }: {
    /** Panel content shown inside the drawer (typically the app's SettingsPanel). */
    children: Snippet
    /** i18n key for the trigger button's aria-label. */
    ariaLabelKey?: string
    /** Fallback aria-label if the i18n key is missing. */
    ariaLabelDefault?: string
    /** Icon name for the trigger button. */
    triggerIcon?: IconName
    /** Pixel size for the trigger icon. */
    triggerIconSize?: number
    /** data-mol-id for the trigger button. */
    dataMolId?: string
    class?: string
    disabled?: boolean
    /** Override the trigger's click handler (e.g. to open an auth modal first). */
    onclick?: () => void
    /** Which side of the viewport the panel opens from. */
    side?: 'left' | 'right'
  } = $props()

  const cm = getClassMap()
  const { t } = createAppI18nStores()

  let open = $state(false)

  // Panel content dismisses the drawer through this context instead of an
  // onClose prop threaded through every section.
  setPanelCloseContext(() => {
    open = false
  })

  // Close the drawer whenever the route changes. SvelteKit updates `page` on
  // both in-app navigation and browser back/forward, so a single statement
  // covers both — without it the drawer stays mounted over the next page and
  // blocks clicks underneath.
  $effect(() => {
    void $page.url.pathname
    void $page.url.search
    open = false
  })

  let drawerClass = $derived(side === 'left' ? cm.cn(cm.drawer, cm.drawerLeft) : cm.drawer)
</script>

<Button
  variant="ghost"
  size="sm"
  onclick={onclick ?? (() => (open = true))}
  aria-label={$t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
  data-mol-id={dataMolId}
  // 40x40 trigger floor: the icon-only size="sm" button measured 42x26px
  // fleet-wide (flagged as a tiny target in every app QA). Apps can still
  // widen via className; the floor is the default.
  class={cm.cn(cm.minH(10), cm.minW(10), className)}
  {disabled}
>
  <Icon name={triggerIcon} size={triggerIconSize} />
</Button>
<Modal
  {open}
  onClose={() => (open = false)}
  class={drawerClass}
  // The drawer has no `title`, so without an explicit label the dialog is
  // announced as an unnamed "dialog" — give it a name.
  aria-label={$t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' })}
>
  {@render children()}
</Modal>
