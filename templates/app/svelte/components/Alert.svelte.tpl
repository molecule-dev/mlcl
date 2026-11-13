<script lang="ts">
  import type { Snippet } from 'svelte'

  import { t } from '@molecule/app-i18n'
  import type { IconName } from '@molecule/app-icons'
  import type { AlertProps, ColorVariant } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import RenderIcon from './RenderIcon.svelte'

  let {
    title = undefined,
    status = 'info',
    variant = undefined,
    live = true,
    dismissible = false,
    onDismiss = undefined,
    dismissLabel = undefined,
    class: className = undefined,
    children = undefined,
  }: {
    title?: string
    status?: ColorVariant
    variant?: AlertProps['variant']
    /** `role="alert"` (assertive) when true, `role="status"` otherwise. */
    live?: boolean
    dismissible?: boolean
    onDismiss?: () => void
    dismissLabel?: string
    class?: string
    children?: Snippet
  } = $props()

  const cm = getClassMap()

  const STATUS_VARIANT_MAP: Record<
    ColorVariant,
    'default' | 'info' | 'success' | 'warning' | 'error'
  > = {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

  const STATUS_ICON_MAP: Record<string, IconName> = {
    info: 'info-circle',
    success: 'check-circle',
    warning: 'exclamation-triangle',
    error: 'x-circle',
  }

  let alertVariant = $derived(STATUS_VARIANT_MAP[status] || 'default')
  let iconName = $derived(STATUS_ICON_MAP[alertVariant])
  // variant="left-accent" renders as a 4px status-colored leading bar.
  let classes = $derived(
    cm.cn(
      cm.alert({ variant: alertVariant }),
      variant === 'left-accent' ? cm.alertLeftAccent({ variant: alertVariant }) : '',
      className,
    ),
  )
</script>

<div role={live ? 'alert' : 'status'} class={classes}>
  {#if iconName}
    <span class={cm.alertIconWrapper}><RenderIcon name={iconName} class={cm.iconMd} /></span>
  {/if}
  <div class={cm.alertContent}>
    {#if title}
      <h5 class={cm.alertTitle}>{title}</h5>
    {/if}
    <div class={cm.alertDescription}>
      {#if children}{@render children()}{/if}
    </div>
  </div>
  {#if dismissible}
    <button
      type="button"
      onclick={onDismiss}
      class={cm.alertDismiss}
      aria-label={dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })}
    >
      <RenderIcon name="x-mark" class={cm.iconSm} />
    </button>
  {/if}
</div>
