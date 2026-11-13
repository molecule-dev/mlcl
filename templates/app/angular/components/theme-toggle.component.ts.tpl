import { Component, inject } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { MoleculeThemeService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { IconComponent } from './icon.component.js'

/**
 * Button that flips the bonded theme between light and dark.
 *
 * Port of `@molecule/app-ui-react`'s `ThemeToggle`: carries the
 * `data-mol-id="theme-toggle"` / `data-mode` / `aria-pressed` hooks tests and AI
 * agents select on, and shows the moon in dark mode, the sun otherwise.
 */
@Component({
  selector: 'app-theme-toggle',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [AsyncPipe, IconComponent],
  template: `
    @if (mode$ | async; as mode) {
      <button
        type="button"
        data-mol-id="theme-toggle"
        [attr.data-mode]="mode"
        [attr.aria-pressed]="mode === 'dark'"
        [attr.aria-label]="t('theme.toggle', {}, { defaultValue: 'Toggle theme' })"
        (click)="toggleTheme()"
        [class]="cm.themeToggleButton"
      >
        @if (mode === 'dark') {
          <svg appIcon name="moon" [size]="20"></svg>
        } @else {
          <svg appIcon name="sun" [size]="20"></svg>
        }
      </button>
    }
  `,
})
export class ThemeToggleComponent {
  private readonly themeService = inject(MoleculeThemeService)

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The current theme mode (`light` | `dark`). */
  mode$ = this.themeService.mode$

  /** Switches to the next theme. */
  toggleTheme(): void {
    this.themeService.toggleTheme()
  }
}
