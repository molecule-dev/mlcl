import { Component, inject, Input } from '@angular/core'
import { type SafeHtml, DomSanitizer } from '@angular/platform-browser'
import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      [attr.viewBox]="viewBox"
      [attr.fill]="fillAttr"
      [attr.stroke]="isStroked ? icon.stroke : null"
      [attr.stroke-width]="isStroked ? icon.strokeWidth : null"
      [attr.stroke-linecap]="isStroked ? icon.strokeLinecap : null"
      [attr.stroke-linejoin]="isStroked ? icon.strokeLinejoin : null"
      [class]="iconClass"
      [innerHTML]="svgContent"
    ></svg>
  `,
})
export class IconComponent {
  @Input() name!: string
  @Input() size = 20
  @Input() iconClass = ''

  icon!: IconData
  viewBox = '0 0 20 20'
  isStroked = false
  fillAttr = 'currentColor'
  svgContent: SafeHtml = ''

  private sanitizer = inject(DomSanitizer)

  ngOnChanges(): void {
    this.icon = getIcon(this.name)
    this.viewBox = this.icon.viewBox || '0 0 20 20'
    this.isStroked = !!this.icon.stroke

    if (this.icon.svg) {
      this.fillAttr = this.icon.fill || 'none'
      this.svgContent = this.sanitizer.bypassSecurityTrustHtml(this.icon.svg)
    } else {
      this.fillAttr = this.isStroked ? 'none' : (this.icon.fill || 'currentColor')
      const pathsHtml = this.icon.paths
        .map((p) => {
          const attrs = [`d="${p.d}"`]
          if (p.fill) attrs.push(`fill="${p.fill}"`)
          if (p.fillRule) attrs.push(`fill-rule="${p.fillRule}"`)
          if (p.clipRule) attrs.push(`clip-rule="${p.clipRule}"`)
          if (p.opacity !== undefined) attrs.push(`opacity="${p.opacity}"`)
          return `<path ${attrs.join(' ')} />`
        })
        .join('')
      this.svgContent = this.sanitizer.bypassSecurityTrustHtml(pathsHtml)
    }
  }
}
