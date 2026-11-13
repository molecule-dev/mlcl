import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggleComponent } from './theme-toggle.component.js'
import { UserMenuComponent } from './user-menu.component.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

/**
 * Sticky top app-shell header — logo + app name on the left, theme toggle and
 * user menu on the right.
 *
 * Port of `@molecule/app-header-react`'s `AppHeader` with the app's `appName`
 * and `logoSize`, so the header, its ClassMap tokens (`cm.headerBar`,
 * `cm.headerFixed`, `cm.headerInner`, `cm.logoText`) and its slots match the
 * React scaffolded app exactly.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent, UserMenuComponent],
  template: `
    <header [class]="cm.cn(cm.headerBar, cm.headerFixed)">
      <div [class]="cm.headerInner">
        <div [class]="cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h('full'))">
          <a routerLink="/">
            <div [class]="cm.flex({ align: 'center', gap: 'xs' })">
              <img src="/logo.svg" [width]="LOGO_SIZE" [height]="LOGO_SIZE" alt="" />
              <span [class]="cm.logoText">{{ APP_NAME }}</span>
            </div>
          </a>
          <div [class]="cm.flex({ align: 'center', gap: 'sm' })">
            <app-theme-toggle />
            <app-user-menu />
          </div>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The app's display name. */
  APP_NAME = APP_NAME
  /** The logo size in pixels. */
  LOGO_SIZE = LOGO_SIZE
}
