import { Component, inject, type OnDestroy } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import type { Subscription } from 'rxjs'

import { t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { Button, MoleculeModal } from '@molecule/app-ui-angular'

import { IconComponent } from './icon.component.js'
import { SettingsPanelComponent } from './settings-panel.component.js'

/**
 * Icon trigger that opens the app's settings panel in a drawer.
 *
 * Port of `@molecule/app-ui-react`'s `UserMenu` with the app's settings panel as
 * the drawer content: the trigger carries `data-mol-id="user-menu"`, the
 * 40x40 minimum target and the `userMenu.open` label; the drawer is a modal
 * with `cm.drawer` and the `userMenu.panelLabel` name; the drawer closes on
 * any route change so it never stays mounted over the next page.
 */
@Component({
  selector: 'app-user-menu',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [Button, MoleculeModal, IconComponent, SettingsPanelComponent],
  template: `
    <button
      mol-button
      variant="ghost"
      size="sm"
      data-mol-id="user-menu"
      [attr.aria-label]="t('userMenu.open', {}, { defaultValue: 'Open user menu' })"
      [className]="triggerClasses"
      (click)="open = true"
    >
      <svg appIcon name="user" [size]="20"></svg>
    </button>
    <mol-modal
      [open]="open"
      [className]="cm.drawer"
      [attr.aria-label]="t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' })"
      (close)="open = false"
    >
      <!-- The panel mounts only while the drawer is open: it is the heaviest
          thing the app shell can pull in (account, auth, billing, devices and
          notifications sections), and each section loads its own data. -->
      @if (open) {
        <app-settings-panel (closePanel)="open = false" />
      }
    </mol-modal>
  `,
})
export class UserMenuComponent implements OnDestroy {
  private readonly router = inject(Router)
  private readonly subscription: Subscription

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** Whether the drawer is open. */
  open = false

  /** The 40x40 trigger floor the shared menu applies. */
  get triggerClasses(): string {
    return this.cm.cn(this.cm.minH(10), this.cm.minW(10))
  }

  constructor() {
    // Close the drawer whenever the route changes — in-app navigation and
    // browser back/forward both arrive as NavigationEnd, so one subscription
    // covers both; without it the drawer stays mounted over the next page and
    // blocks clicks underneath.
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.open = false
    })
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }
}
