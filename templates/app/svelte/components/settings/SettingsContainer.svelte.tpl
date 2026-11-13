<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { setSettingsPanelContext } from '../../lib/settings-panel-context.js'

  let {
    onClose,
    children,
  }: {
    /** Dismisses the settings panel (the drawer the app mounts this in). */
    onClose: () => void
    children: Snippet
  } = $props()

  const cm = getClassMap()

  // Publish onClose to descendants so sections can dismiss the panel after an
  // action without explicit prop threading. The closure reads the prop
  // reactively, so a re-parented handler is honored.
  setSettingsPanelContext({
    onClose: () => {
      onClose()
    },
  })
</script>

<div class={cm.cn(cm.sp('p', 6), cm.stack(6))}>
  {@render children()}
</div>
