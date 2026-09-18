import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { t } from '@molecule/app-angular'
import { MoleculeButton } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { FooterComponent } from '../components/footer.component.js'
import { ThemeToggleComponent } from '../components/theme-toggle.component.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

@Component({
  selector: 'app-plan-updated',
  standalone: true,
  imports: [RouterLink, MoleculeButton, FooterComponent, ThemeToggleComponent],
  template: `
    <div [class]="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
      <header [class]="cm.headerBar">
        <div [class]="cm.cn(cm.container({ size: 'xl' }), cm.h(16))">
          <div [class]="cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h('full'))">
            <div [class]="cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xl'), cm.fontWeight('bold'))">
              <img src="/logo.svg" [width]="LOGO_SIZE" [height]="LOGO_SIZE" alt="" />
              {{ APP_NAME }}
            </div>
            <app-theme-toggle />
          </div>
        </div>
      </header>
      <div [class]="cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' }), cm.sp('px', 4), cm.sp('py', 8))">
        <div [class]="cm.cn(cm.w('full'), cm.maxW('sm'))">
          <div [class]="cm.cn(cm.textCenter)">
            <h2 [class]="headingClasses">{{ t('planUpdated.message') }}</h2>
            <h2 [class]="subheadingClasses">{{ t('planUpdated.thankYou') }}</h2>
            <a routerLink="/">
              <mol-button>{{ t('planUpdated.returnHome') }}</mol-button>
            </a>
          </div>
          <app-footer />
        </div>
      </div>
    </div>
  `,
})
export class PlanUpdatedComponent {
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  APP_NAME = APP_NAME
  LOGO_SIZE = LOGO_SIZE
  get headingClasses(): string { return this.cm.cn(this.cm.textSize('2xl'), this.cm.fontWeight('bold'), this.cm.sp('mb', 2)) }
  get subheadingClasses(): string { return this.cm.cn(this.cm.textSize('2xl'), this.cm.fontWeight('bold'), this.cm.sp('mb', 8)) }
}
