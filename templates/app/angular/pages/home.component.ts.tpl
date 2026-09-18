import { Component, inject } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MoleculeAuthService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (user$ | async; as user) {
      <div [class]="wrapperClasses">
        <h2 [class]="headingClasses">
          {{ t('home.greeting') }}, {{ user.name || user.email || t('home.world') }}!
        </h2>
      </div>
    }
  `,
})
export class HomeComponent {
  private authService = inject(MoleculeAuthService)
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  user$ = this.authService.user$
  get wrapperClasses(): string { return this.cm.cn(this.cm.textCenter, this.cm.sp('py', 12)) }
  get headingClasses(): string { return this.cm.cn(this.cm.textSize('3xl'), this.cm.fontWeight('bold')) }
}
