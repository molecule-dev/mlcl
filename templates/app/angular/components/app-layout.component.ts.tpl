import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

import { AppShellLayout } from '@molecule/app-shell-layout-angular'

{{#feature footer}}
import { FooterComponent } from './footer.component.js'
{{/feature}}
import { HeaderComponent } from './header.component.js'

/**
 * This component is used as a nested route element: render `<router-outlet />`
 * where the page belongs. The Angular Router does not pass nested route
 * components as children; replacing the outlet with a children projection
 * leaves every page empty while the header and footer still render.
 */
@Component({
  selector: 'app-layout',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
{{#feature footer}}
  imports: [AppShellLayout, RouterOutlet, HeaderComponent, FooterComponent],
{{/feature}}
{{^feature footer}}
  imports: [AppShellLayout, RouterOutlet, HeaderComponent],
{{/feature}}
  template: `
    <div mol-shell-layout>
      <app-header slot="header"></app-header>
      <router-outlet />
{{#feature footer}}
      <app-footer slot="footer"></app-footer>
{{/feature}}
    </div>
  `,
})
export class AppLayoutComponent {}
