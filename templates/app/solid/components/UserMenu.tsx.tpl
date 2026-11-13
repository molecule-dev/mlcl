import { useLocation } from '@solidjs/router'
import { createEffect, createSignal } from 'solid-js'

import { useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-solid'

import { Icon } from './Icon.js'
import { SettingsPanel } from './SettingsPanel.js'

/**
 * Avatar-style trigger that opens the app's settings panel in a drawer.
 *
 * The panel dismisses the drawer through the `onClose` prop threaded into
 * `SettingsPanel` (the React reference reaches the same callback through
 * `usePanelClose()` context).
 *
 * Ships with `data-mol-id="user-menu"` on the trigger button by default
 * for AI-agent / e2e selection.
 */
export function UserMenu() {
  const cm = getClassMap()
  const t = useTranslate()
  const location = useLocation()
  const [open, setOpen] = createSignal(false)

  // Close the drawer whenever the route changes. The router updates
  // `location` on both in-app navigation and browser back/forward
  // (popstate), so a single effect covers both — without it the drawer
  // stays mounted over the next page and blocks clicks underneath.
  createEffect(() => {
    void location.pathname
    void location.search
    setOpen(false)
  })

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t('userMenu.open', undefined, { defaultValue: 'Open user menu' })}
        data-mol-id="user-menu"
        // 40x40 trigger floor: the icon-only `size="sm"` button measured
        // 42x26px fleet-wide (flagged as a tiny target in every app QA).
        className={cm.cn(cm.minH(10), cm.minW(10))}
      >
        <Icon name="user" size={20} />
      </Button>
      <Modal
        open={open()}
        onClose={() => setOpen(false)}
        className={cm.drawer}
        aria-label={t('userMenu.panelLabel', undefined, { defaultValue: 'Account menu' })}
      >
        <SettingsPanel onClose={() => setOpen(false)} />
      </Modal>
    </>
  )
}
