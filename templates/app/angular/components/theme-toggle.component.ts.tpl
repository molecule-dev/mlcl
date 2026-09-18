import { Component, inject } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MoleculeThemeService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { IconComponent } from './icon.component.js'

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [AsyncPipe, IconComponent],
  template: `
    @if (themeName$ | async; as themeName) {
      <button
        type="button"
        (click)="toggleTheme()"
        [attr.aria-label]="t('theme.toggle')"
        [class]="cm.themeToggleButton"
      >
        @if (themeName === 'light') {
          <app-icon name="sun" [size]="20" />
        } @else {
          <app-icon name="moon" [size]="20" />
        }
      </button>
    }
  `,
})
export class ThemeToggleComponent {
  private themeService = inject(MoleculeThemeService)
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  themeName$ = this.themeService.themeName$

  toggleTheme(): void {
    this.themeService.toggleTheme()
  }
}
