{{#feature settings}}
import { lazy, Suspense } from 'solid-js'

import { usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-solid'

// The settings panel is split out of the entry: it mounts only when the user
// opens the drawer, and it is the heaviest thing the app shell can pull in
// (account, auth, billing, devices and notifications sections plus their
// translation bundles). A static import here ships all of that on every page.
const SettingsPanel = lazy(() =>
  import('./SettingsPanel.js').then((m) => ({ default: m.SettingsPanel })),
)

// Rendered inside MoleculeUserMenu's drawer, so it can read the drawer's close
// callback via usePanelClose() (no onClose prop-threading from the trigger).
function UserMenuPanel() {
  return (
    <Suspense fallback={null}>
      <SettingsPanel onClose={usePanelClose()} />
    </Suspense>
  )
}

export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}
{{/feature}}
{{^feature settings}}
import { Show } from 'solid-js'

import { useAuth, useTranslation } from '@molecule/app-solid'
import { Button } from '@molecule/app-ui-solid'

/**
 * The signed-in user's log-out button. A settings page and drawer come with the settings panel
 * package (`npx mlcl add @molecule/app-settings-panel-solid --inject`).
 */
export function UserMenu() {
  const { isAuthenticated, logout } = useAuth()
  const { t } = useTranslation()
  return (
    <Show when={isAuthenticated()}>
      <Button variant="ghost" size="sm" data-mol-id="log-out" onClick={() => void logout()}>
        {t('userMenu.logOut', undefined, { defaultValue: 'Log out' })}
      </Button>
    </Show>
  )
}
{{/feature}}
