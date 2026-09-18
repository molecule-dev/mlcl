import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { getClassMap } from '@molecule/app-ui'
import { HeaderComponent } from './header.component.js'
import { FooterComponent } from './footer.component.js'

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <div [class]="cm.cn(cm.page, cm.appLayout)">
      <app-header />
      <main>
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
})
export class AppLayoutComponent {
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
}
