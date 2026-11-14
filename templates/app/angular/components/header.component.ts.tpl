import { Component } from '@angular/core'

import { AppHeader } from '@molecule/app-header-angular'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { UserMenuComponent } from './user-menu.component.js'

/**
 * Thin wrapper around the shared `AppHeader` that injects this app's branding
 * and user menu. The shared package renders the header bar, the logo + app
 * name, the default theme toggle and the user-menu slot.
 */
@Component({
  selector: 'app-header',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [AppHeader, UserMenuComponent],
  template: `
    <header mol-app-header [appName]="APP_NAME" [logoSize]="LOGO_SIZE">
      <app-user-menu slot="userMenu"></app-user-menu>
    </header>
  `,
})
export class HeaderComponent {
  /** The app's display name. */
  readonly APP_NAME = APP_NAME
  /** The logo size in pixels. */
  readonly LOGO_SIZE = LOGO_SIZE
}
