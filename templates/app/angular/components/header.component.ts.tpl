import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggleComponent } from './theme-toggle.component.js'
import { UserMenuComponent } from './user-menu.component.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, ThemeToggleComponent, UserMenuComponent],
  template: `
    <header [class]="cm.headerBar">
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
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  APP_NAME = APP_NAME
  LOGO_SIZE = LOGO_SIZE
}
