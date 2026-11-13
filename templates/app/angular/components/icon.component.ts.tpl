import { Component, ElementRef, inject, Input, type OnChanges, Renderer2 } from '@angular/core'

import { getIcon, type IconData, type IconName } from '@molecule/app-icons'

/**
 * An SVG glyph looked up by `name` from the bonded `@molecule/app-icons` set.
 *
 * Port of `@molecule/app-ui-react`'s `Icon`: the host element IS the `<svg>`
 * (selector `svg[appIcon]`), so no wrapper element is rendered. It handles the
 * two icon-data shapes a bond returns — pre-rendered SVG markup (`icon.svg`, the
 * bond is the trust boundary, exactly like React's `dangerouslySetInnerHTML`)
 * and structured paths (`icon.paths`) rendered as `<path>` children with the
 * optional stroke styling forwarded from the icon set.
 *
 * Decorative by default (`aria-hidden` + `focusable="false"`), like React, so
 * screen readers skip a glyph that carries no name of its own.
 *
 * @example
 * ```html
 * <svg appIcon name="globe" [size]="14"></svg>
 * ```
 */
@Component({
  selector: 'svg[appIcon]',
  standalone: true,
  inputs: ['name', 'size', 'className'],
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
    focusable: 'false',
    '[attr.width]': 'size',
    '[attr.height]': 'size',
    '[attr.viewBox]': 'viewBox',
    '[attr.fill]': 'fillAttr',
    '[attr.stroke]': 'isStroked ? icon?.stroke : null',
    '[attr.stroke-width]': 'isStroked ? icon?.strokeWidth : null',
    '[attr.stroke-linecap]': 'isStroked ? icon?.strokeLinecap : null',
    '[attr.stroke-linejoin]': 'isStroked ? icon?.strokeLinejoin : null',
    '[class]': 'className',
  },
  template: '',
})
export class IconComponent implements OnChanges {
  /** Name of the glyph to look up in the bonded icon set. */
  @Input({ required: true }) name!: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 20. */
  @Input() size = 20
  /** Class name forwarded to the root `<svg>`. */
  @Input() className = ''

  /** The resolved icon data (`undefined` while the glyph is missing). */
  icon?: IconData
  /** The `viewBox` of the resolved glyph. */
  viewBox = '0 0 20 20'
  /** Whether the glyph carries stroke styling. */
  isStroked = false
  /** The `fill` attribute of the root `<svg>`. */
  fillAttr = 'currentColor'

  private readonly host = inject(ElementRef<SVGElement>)
  private readonly renderer = inject(Renderer2)

  /**
   * Resolves the glyph and writes its children.
   *
   * Runs before the host bindings of the same change-detection pass, so the
   * first render already carries the right attributes and children.
   */
  ngOnChanges(): void {
    let icon: IconData
    try {
      icon = getIcon(this.name)
    } catch (error) {
      // Graceful degradation: an icon name missing from the bonded set (icon-set
      // version skew, a custom set with a smaller catalog) must NOT crash the
      // whole app. Warn and render a neutral placeholder circle instead —
      // exactly the React component's fallback.
      console.warn(`Icon: no bonded glyph for "${this.name}" — rendering a placeholder.`, error)
      this.icon = undefined
      this.viewBox = '0 0 20 20'
      this.isStroked = false
      this.fillAttr = 'none'
      this.setMarkup('<circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />')
      return
    }

    this.icon = icon
    this.viewBox = icon.viewBox || '0 0 20 20'
    this.isStroked = !!icon.stroke
    this.fillAttr = this.isStroked ? 'none' : icon.fill || 'currentColor'
    this.setMarkup(icon.svg ? icon.svg : this.pathsMarkup(icon))
  }

  /**
   * Serializes the glyph's structured paths (the React component's
   * `<path>` children).
   *
   * @param icon - The resolved icon data.
   * @returns The `<path>` markup for the glyph.
   */
  private pathsMarkup(icon: IconData): string {
    return icon.paths
      .map((path) => {
        const attrs = [`d="${path.d}"`]
        if (path.fill) attrs.push(`fill="${path.fill}"`)
        if (path.fillRule) attrs.push(`fill-rule="${path.fillRule}"`)
        if (path.clipRule) attrs.push(`clip-rule="${path.clipRule}"`)
        if (path.opacity !== undefined) attrs.push(`opacity="${path.opacity}"`)
        return `<path ${attrs.join(' ')} />`
      })
      .join('')
  }

  /**
   * Writes the glyph markup into the `<svg>` host.
   *
   * @param markup - SVG child markup from the bonded icon set.
   */
  private setMarkup(markup: string): void {
    this.renderer.setProperty(this.host.nativeElement, 'innerHTML', markup)
  }
}
