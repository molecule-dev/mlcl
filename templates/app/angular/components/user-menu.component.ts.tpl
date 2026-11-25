{{#feature settings}}
import { NgComponentOutlet } from '@angular/common'
import { Component, effect, signal, type Type, viewChild } from '@angular/core'

import { UserMenu } from '@molecule/app-ui-angular'

// The settings panel is split out of the entry: it mounts only when the user
// opens the drawer, and it is the heaviest thing the app shell can pull in
// (account, auth, billing, devices and notifications sections plus their
// translation bundles). A static import here ships all of that on every page.
// This is React's `lazy(() => import('./SettingsPanel.js'))` in Angular's
// idiom: the dynamic import below runs on the drawer's first open (its
// callback is scheduled inside the zone, so the write below renders the
// panel), and the outlet renders nothing until the chunk arrives (React's
// Suspense fallback={null}); closing the drawer unmounts the panel again.
/**
 * Icon trigger that opens the app's settings panel in a drawer.
 *
 * Thin wrapper around `@molecule/app-ui-angular`'s `UserMenu` with the app's
 * settings panel as the drawer content: the trigger carries
 * `data-mol-id="user-menu"`, the 40x40 minimum target and the
 * `userMenu.open` label; the drawer closes on any route change so it never
 * stays mounted over the next page (both live inside the shared component).
 */
@Component({
  selector: 'app-user-menu',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [NgComponentOutlet, UserMenu],
  template: `
    <mol-user-menu #menu>
      @if (panelComponent(); as panel) {
        <ng-container [ngComponentOutlet]="panel"></ng-container>
      }
    </mol-user-menu>
  `,
})
export class UserMenuComponent {
  /** The shared menu's open state (the drawer the panel mounts into). */
  private readonly menu = viewChild('menu', { read: UserMenu })

  /** The lazily loaded panel component, or null while it is not mounted. */
  protected readonly panelComponent = signal<Type<unknown> | null>(null)

  constructor() {
    // React's lazy() mount point: the drawer's open signal drives both the load
    // and the unmount, so the panel's sections fetch only while it is shown.
    effect(() => {
      const menu = this.menu()
      if (!menu) return
      if (menu.isOpen()) {
        if (this.panelComponent() === null) {
          void import('./settings-panel.component.js').then(
            (module) => this.panelComponent.set(module.SettingsPanelComponent),
            (error: unknown) => {
              // A failed panel chunk must be visible, not a silently-empty drawer.
              console.error('Failed to load the settings panel', error)
            },
          )
        }
      } else if (this.panelComponent() !== null) {
        this.panelComponent.set(null)
      }
    })
  }
}
{{/feature}}
{{^feature settings}}
import { Component } from '@angular/core'

import { useAuth, useTranslation } from '@molecule/app-angular'
import { Button } from '@molecule/app-ui-angular'

/**
 * The signed-in user's log-out button. A settings page and drawer come with the settings panel
 * package (`npx mlcl add @molecule/app-settings-panel-angular --inject`).
 */
@Component({
  selector: 'app-user-menu',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [Button],
  template: `
    @if (auth.isAuthenticated()) {
      <button
        mol-button
        type="button"
        variant="ghost"
        size="sm"
        data-mol-id="log-out"
        (click)="logOut()"
      >
        {{ t('userMenu.logOut', undefined, { defaultValue: 'Log out' }) }}
      </button>
    }
  `,
})
export class UserMenuComponent {
  /** The signed-in state and the log-out call. */
  protected readonly auth = useAuth()

  private readonly i18n = useTranslation()

  /** Translates a key. */
  protected readonly t = this.i18n.t

  /** Ends the session. */
  protected logOut(): void {
    void this.auth.logout()
  }
}
{{/feature}}
