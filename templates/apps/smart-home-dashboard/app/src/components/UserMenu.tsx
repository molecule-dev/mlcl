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

export function UserMenu({ dataMolId }: { dataMolId?: string }) {
  return (
    // The shared ghost trigger renders ~26px tall — under a comfortable
    // touch target. Compose min sizes onto it here (template-local, per the
    // fleet tap-target floor) rather than padding whatever wraps it.
    <MoleculeUserMenu
      side="left"
      className="min-h-[40px] min-w-[40px]"
      dataMolId={dataMolId ?? 'user-menu'}
    >
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
