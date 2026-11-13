import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { getClassMap } from '@molecule/app-ui'
import { HeaderComponent } from './header.component.js'
import { FooterComponent } from './footer.component.js'

/**
 * Top-level page scaffold: header → main (constrained by the container) → footer.
 *
 * Port of `@molecule/app-shell-layout-react`'s `AppShellLayout` with
 * `maxWidth="xl"` and the app's header/footer slots: the page frame uses
 * `cm.page` + `cm.appLayout`, the routed content sits inside the same
 * `cm.container({ size: 'xl' })` + `cm.mxAuto` wrapper React's `Container`
 * renders, and `<main>` carries no padding of its own.
 */
@Component({
  selector: 'app-layout',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <div [class]="cm.cn(cm.page, cm.appLayout)">
      <app-header />
      <main>
        <div [class]="cm.cn(cm.container({ size: 'xl' }), cm.mxAuto)">
          <router-outlet />
        </div>
      </main>
      <app-footer />
    </div>
  `,
})
export class AppLayoutComponent {
  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }
}
