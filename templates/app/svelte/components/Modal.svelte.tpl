<script module lang="ts">
  // Module-level open-modal stack. Every open Modal instance registers its
  // instance id here. Escape and the Tab focus trap only act for the TOPMOST
  // entry, so a confirm dialog stacked over a drawer doesn't let one Escape
  // press close both (the user could never tell which action was cancelled).
  const openModalStack: string[] = []

  function pushModalStack(id: string): void {
    if (!openModalStack.includes(id)) openModalStack.push(id)
  }

  function popModalStack(id: string): void {
    const index = openModalStack.indexOf(id)
    if (index !== -1) openModalStack.splice(index, 1)
  }

  function isTopOfModalStack(id: string): boolean {
    return openModalStack.length > 0 && openModalStack[openModalStack.length - 1] === id
  }

  // Reference-counted body scroll lock. Two modals can be open at once (a
  // drawer with a confirm dialog above it); without a shared counter, closing
  // EITHER one reset `overflow` to '', silently unlocking page scroll behind
  // the dialog that is still open.
  let scrollLockCount = 0
  let previousBodyOverflow = ''

  function lockBodyScroll(): void {
    if (scrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    scrollLockCount += 1
  }

  function unlockBodyScroll(): void {
    scrollLockCount = Math.max(0, scrollLockCount - 1)
    if (scrollLockCount === 0) {
      document.body.style.overflow = previousBodyOverflow
    }
  }

  // Elements the WAI-ARIA APG dialog pattern treats as tab-stops for the trap.
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

  function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  }

  // The framework package renders the modal into document.body via
  // createPortal, so the overlay and the dialog escape any ancestor stacking
  // context. This action moves each rendered node to the body the same way.
  function portal(node: HTMLElement) {
    document.body.appendChild(node)
    return {
      destroy() {
        node.remove()
      },
    }
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'

  import { t } from '@molecule/app-i18n'
  import type { ModalSize } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import RenderIcon from './RenderIcon.svelte'

  let {
    open = false,
    onClose,
    title = undefined,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    footer = undefined,
    centered = true,
    closeLabel = undefined,
    preventScroll = true,
    class: className = undefined,
    children = undefined,
    ...rest
  }: {
    open?: boolean
    onClose: () => void
    title?: string
    size?: ModalSize
    showCloseButton?: boolean
    closeOnOverlayClick?: boolean
    closeOnEscape?: boolean
    footer?: Snippet
    centered?: boolean
    closeLabel?: string
    preventScroll?: boolean
    class?: string
    children?: Snippet
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  // Per-instance title id AND stack key. A hardcoded 'modal-title' duplicated
  // the id whenever two modals were mounted (stacked dialogs) — aria-labelledby
  // then resolved to the FIRST match, so screen readers announced the WRONG
  // dialog title.
  const instanceId = $props.id()

  let dialogRef = $state<HTMLDivElement | null>(null)
  // The element focused right before this dialog opened — restored on close.
  let previouslyFocused: HTMLElement | null = null

  // Only data-* / aria-* props pass through to the inner dialog element.
  let passthrough = $derived.by(() => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('data-') || key.startsWith('aria-')) out[key] = value
    }
    return out
  })

  // Stack registration + move focus INTO the dialog on open + restore focus to
  // whatever was focused before on close.
  $effect(() => {
    if (!open) return
    previouslyFocused = document.activeElement as HTMLElement | null
    pushModalStack(instanceId)
    const dialogEl = dialogRef
    if (dialogEl) {
      const focusables = getFocusableElements(dialogEl)
      ;(focusables[0] ?? dialogEl).focus()
    }
    return () => {
      popModalStack(instanceId)
      // Best-effort restore: if the opener was removed from the document while
      // the dialog was open, there is nothing sensible to restore focus to.
      const toRestore = previouslyFocused
      if (toRestore && document.contains(toRestore)) toRestore.focus()
    }
  })

  // Reference-counted body scroll lock, independent of focus and Escape.
  $effect(() => {
    if (!open || !preventScroll) return
    lockBodyScroll()
    return () => unlockBodyScroll()
  })

  // Escape + Tab focus trap. Both svelte:window and the centering wrapper run
  // this — the stack check makes every non-topmost instance a no-op, so a
  // lower drawer never closes on a confirm dialog's Escape.
  function handleKeyDown(event: KeyboardEvent): void {
    if (!open) return
    if (event.key === 'Escape') {
      if (closeOnEscape && isTopOfModalStack(instanceId)) onClose()
      return
    }
    if (event.key !== 'Tab' || !isTopOfModalStack(instanceId)) return

    const el = dialogRef
    if (!el) return
    const focusables = getFocusableElements(el)
    if (focusables.length === 0) {
      event.preventDefault()
      el.focus()
      return
    }

    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement

    if (event.shiftKey) {
      if (active === first || !el.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !el.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  /**
   * Click-outside dismissal for the centering wrapper.
   *
   * The wrapper IS the full-screen backdrop behind the dialog. Its click
   * listener is attached as an action rather than an `onclick` attribute for
   * the same reason the framework package's Modal renders a plain `<div>` with
   * an `onClick`: dismissing by backdrop is a mouse-only convenience — the
   * keyboard path is Escape and the dialog's close button — so the element
   * must not claim an interactive role the dialog pattern does not give it,
   * and the rendered markup stays identical to React's.
   */
  function backdrop(node: HTMLElement) {
    const listener = (event: MouseEvent): void => {
      if (closeOnOverlayClick && event.target === node) onClose()
    }
    node.addEventListener('click', listener)
    return {
      destroy() {
        node.removeEventListener('click', listener)
      },
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <!-- Overlay background -->
  <div class={cm.dialogOverlay} aria-hidden="true" use:portal></div>

  <!-- Centering wrapper. `centered={false}` is expressed as the one
       inline-style exception the workspace styling rule allows for values
       ClassMap genuinely cannot express (dialogWrapper is a fixed token, not
       a parameterized one). The overlay click closes: the wrapper is the
       backdrop's click target exactly as in the framework package, where the
       wrapper is a plain div (Escape and the close button are the keyboard
       path, so no interactive role is claimed here). -->
  <div
    class={cm.dialogWrapper}
    style={centered ? undefined : 'align-items: flex-start;'}
    use:backdrop
    use:portal
  >
    <!-- Content -->
    <div
      bind:this={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? instanceId : undefined}
      tabindex="-1"
      class={cm.cn(cm.modal({ size }), className)}
      onclick={(event) => event.stopPropagation()}
      {...passthrough}
    >
      <!-- With a title the close button shares the header row; without one it
           floats over the top-right corner — a title-less modal must not spend
           a full-width header band on just the X. -->
      {#if title}
        <div class={cm.dialogHeader}>
          <h2 id={instanceId} class={cm.dialogTitle}>{title}</h2>
          {#if showCloseButton}
            <button
              type="button"
              onclick={onClose}
              class={cm.dialogClose}
              data-mol-id="modal-close"
              aria-label={closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}
            >
              <RenderIcon name="x-mark" class={cm.iconMd} />
            </button>
          {/if}
        </div>
      {:else if showCloseButton}
        <button
          type="button"
          onclick={onClose}
          class={cm.dialogCloseFloating}
          data-mol-id="modal-close"
          aria-label={closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}
        >
          <RenderIcon name="x-mark" class={cm.iconMd} />
        </button>
      {/if}

      <div class={cm.dialogBody}>
        {#if children}{@render children()}{/if}
      </div>

      {#if footer}
        <div class={cm.dialogFooter}>{@render footer()}</div>
      {/if}
    </div>
  </div>
{/if}
