import { Component, EventEmitter, Input, Output } from '@angular/core'

import { getClassMap } from '@molecule/app-ui'

/** Monotonic id source so every generated input id is unique on the page. */
let nextFloatingInputId = 0

/**
 * An input with a floating label.
 *
 * Port of `@molecule/app-ui-react`'s `FloatingInput`: the placeholder text is
 * rendered as a small uppercase label always visible at the top of the input,
 * and it is a real `<label for>` (not a bare span), so it is the input's
 * programmatic accessible name via label association.
 *
 * The caller owns the value (the template binds `[value]` and listens to
 * `(valueChange)`), matching React's controlled usage on the auth pages.
 */
@Component({
  selector: 'app-floating-input',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  inputs: ['type', 'value', 'placeholder', 'autocomplete', 'required', 'name', 'id', 'className'],
  template: `
    <span [class]="cm.floatingInputWrapper">
      <input
        [attr.id]="inputId"
        [attr.type]="type"
        [value]="value"
        [attr.placeholder]="placeholder || null"
        [attr.autocomplete]="autocomplete || null"
        [attr.required]="required ? '' : null"
        [attr.name]="name || null"
        [class]="inputClasses"
        (input)="onInput($event)"
      />
      @if (placeholder) {
        <label [attr.for]="inputId" [class]="cm.floatingLabel">{{ placeholder }}</label>
      }
    </span>
  `,
})
export class FloatingInputComponent {
  /** Input type (`text` by default). */
  @Input() type = 'text'
  /** Controlled value. */
  @Input() value = ''
  /** Placeholder text, also rendered as the floating label. */
  @Input() placeholder = ''
  /** `autocomplete` attribute value. */
  @Input() autocomplete = ''
  /** Whether the field is required. */
  @Input() required = false
  /** Form field name. */
  @Input() name = ''
  /** Explicit input id (generated when omitted). */
  @Input() id = ''
  /** Extra classes joined onto the input classes. */
  @Input() className = ''
  /** Emits the input's value on every `input` event (React's `onChange`). */
  @Output() readonly valueChange = new EventEmitter<string>()

  /** The resolved input id. */
  readonly inputId = `floating-input-${++nextFloatingInputId}`

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The input class list. */
  get inputClasses(): string {
    return this.cm.cn(this.cm.input(), this.cm.floatingInput, this.className)
  }

  /**
   * Forwards the typed value to the caller.
   *
   * @param event - The native `input` event.
   */
  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value)
  }
}
