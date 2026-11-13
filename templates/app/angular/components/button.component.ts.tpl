import { Component, Input } from '@angular/core'

import type { ButtonSize, ButtonVariant, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { t } from '@molecule/app-angular'

/**
 * Button component.
 *
 * Port of `@molecule/app-ui-react`'s `Button`: the host element IS the
 * `<button>` (selector `button[appButton]`), so the attributes React puts on the
 * button — `type`, `class`, `disabled`, `aria-busy`, `data-mol-id`, `aria-label`
 * — land on the real control. That matters twice over: a `data-mol-id` on a
 * wrapper element cannot be clicked by a selector-driven test or agent (the
 * installed `@molecule/app-ui-angular` `mol-button` host is a separate element
 * with `display: contents`), and a label on the wrapper leaves an icon-only
 * button with no accessible name.
 *
 * While `loading` is true the button is disabled, marked busy and shows the
 * spinner React renders; `loadingText` replaces the projected content.
 */
@Component({
  selector: 'button[appButton]',
  standalone: true,
  inputs: [
    'variant',
    'color',
    'size',
    'loading',
    'loadingText',
    'fullWidth',
    'className',
    'disabled',
    'type',
  ],
  host: {
    '[attr.type]': 'type',
    '[class]': 'classes',
    '[attr.aria-busy]': 'loading',
    '[disabled]': 'disabled || loading',
  },
  template: `
    @if (loading) {
      <div
        role="status"
        [attr.aria-label]="spinnerLabel"
        [class]="cm.cn(cm.spinner({ size: 'sm' }), cm.buttonIconLeft)"
      ></div>
    }
    @if (loading && loadingText) {
      {{ loadingText }}
    } @else {
      <ng-content></ng-content>
    }
  `,
})
export class ButtonComponent {
  /** Visual variant (default `solid`). */
  @Input() variant: ButtonVariant = 'solid'
  /** Color scheme (default `primary`). */
  @Input() color: ColorVariant = 'primary'
  /** Button size (default `md`). */
  @Input() size: ButtonSize = 'md'
  /** Whether the button is in its loading state. */
  @Input() loading = false
  /** Text shown instead of the content while loading. */
  @Input() loadingText?: string
  /** Whether the button stretches to fill its container. */
  @Input() fullWidth = false
  /** Extra classes joined onto the button classes. */
  @Input() className = ''
  /** Whether the button is disabled. */
  @Input() disabled = false
  /** The button's `type` attribute. */
  @Input() type: 'button' | 'submit' | 'reset' = 'button'

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The composed button class list. */
  get classes(): string {
    return this.cm.cn(
      this.cm.button({
        variant: this.variant,
        color: this.color,
        size: this.size,
        fullWidth: this.fullWidth,
      }),
      this.className,
    )
  }

  /** The spinner's accessible label. */
  get spinnerLabel(): string {
    return t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })
  }
}
