import { lazy, Suspense } from 'react'

import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

const SettingsPanel = lazy(() =>
  import('./SettingsPanel.js').then((m) => ({ default: m.SettingsPanel })),
)

function UserMenuPanel() {
  return (
    <Suspense fallback={null}>
      <SettingsPanel onClose={usePanelClose()} />
    </Suspense>
  )
}

export function UserMenu({ side }: { side?: 'left' | 'right' }) {
  return (
    // Trigger ships 26px tall from the shared bundle — pad it to a 40px
    // touch target here (fleet-known gap; the className composes onto the
    // trigger button without changing its icon or layout).
    <MoleculeUserMenu className="min-h-[40px] min-w-[40px]" side={side}>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
