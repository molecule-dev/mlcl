import { Component, EventEmitter, Input, Output } from '@angular/core'
import { getClassMap } from '@molecule/app-ui'

/**
 * An input with a floating label.
 *
 * Shows the placeholder text as a small uppercase label always visible at
 * the top of the input. On focus the label turns primary-colored.
 */
@Component({
  selector: 'app-floating-input',
  standalone: true,
  template: `
    <span [class]="cm.floatingInputWrapper">
      <input
        [class]="inputClasses"
        [type]="type"
        [value]="value"
        [placeholder]="placeholder"
        [autocomplete]="autocomplete"
        [autofocus]="autofocus"
        [required]="required"
        [name]="name"
        (input)="onInput($event)"
      />
      @if (placeholder) {
        <span [class]="cm.floatingLabel">{{ placeholder }}</span>
      }
    </span>
  `,
})
export class FloatingInputComponent {
  @Input() type = 'text'
  @Input() value = ''
  @Input() placeholder = ''
  @Input() autocomplete = ''
  @Input() autofocus = false
  @Input() required = false
  @Input() name = ''
  @Output() valueChange = new EventEmitter<string>()

  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }

  get inputClasses(): string {
    return this.cm.cn(this.cm.input(), this.cm.floatingInput)
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement
    this.valueChange.emit(target.value)
  }
}
