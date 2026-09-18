import { NgComponentOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, type Type } from '@angular/core'
import type { DomSanitizer, SafeHtml } from '@angular/platform-browser'

import { getIcon } from '@molecule/app-icons'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import {
  MoleculeAlert,
  MoleculeBadge,
  MoleculeButton,
  MoleculeCheckbox,
  MoleculeInput,
  MoleculeRadioGroup,
  MoleculeSelect,
  MoleculeSpinner,
  MoleculeSwitch,
  MoleculeToast,
} from '@molecule/app-ui-angular'
import { generateCombinations, showcaseComponents } from '@molecule/app-ui-showcase'

const componentMap: Record<string, Type<unknown>> = {
  Button: MoleculeButton,
  Badge: MoleculeBadge,
  Alert: MoleculeAlert,
  Input: MoleculeInput,
  Select: MoleculeSelect,
  Checkbox: MoleculeCheckbox,
  RadioGroup: MoleculeRadioGroup,
  Switch: MoleculeSwitch,
  Spinner: MoleculeSpinner,
  Toast: MoleculeToast,
}

const cardVariantMap: Record<string, string> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

interface ComboRender {
  inputs: Record<string, unknown>
  content: Node[][]
  props: Record<string, unknown>
}

interface SpecRender {
  name: string
  specIndex: number
  label: string
  component: Type<unknown> | null
  combos: ComboRender[]
  children: string | false | undefined
}

function buildIconSvg(iconName: string, className: string): string {
  const icon = getIcon(iconName)
  const viewBox = icon.viewBox || '0 0 20 20'
  const fill = icon.fill || 'currentColor'
  const attrs: string[] = [
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${viewBox}"`,
    `class="${className}"`,
  ]
  if (icon.stroke || fill === 'none') {
    attrs.push('fill="none"', 'stroke="currentColor"')
    if (icon.strokeWidth) attrs.push(`stroke-width="${icon.strokeWidth}"`)
    if (icon.strokeLinecap) attrs.push(`stroke-linecap="${icon.strokeLinecap}"`)
    if (icon.strokeLinejoin) attrs.push(`stroke-linejoin="${icon.strokeLinejoin}"`)
  } else {
    attrs.push(`fill="${fill}"`)
  }
  const inner =
    icon.svg ||
    icon.paths
      .map((p) => {
        const pa: string[] = [`d="${p.d}"`]
        if (p.fill) pa.push(`fill="${p.fill}"`)
        if (p.fillRule) pa.push(`fill-rule="${p.fillRule}"`)
        if (p.clipRule) pa.push(`clip-rule="${p.clipRule}"`)
        if (p.opacity !== undefined) pa.push(`opacity="${p.opacity}"`)
        return `<path ${pa.join(' ')} />`
      })
      .join('')
  return `<svg ${attrs.join(' ')}>${inner}</svg>`
}

function paginationRange(
  currentPage: number,
  totalPages: number,
  siblings: number,
  boundaries: number,
): (number | 'ellipsis')[] {
  const range: (number | 'ellipsis')[] = []
  for (let i = 1; i <= Math.min(boundaries, totalPages); i++) {
    range.push(i)
  }
  const siblingStart = Math.max(boundaries + 1, currentPage - siblings)
  const siblingEnd = Math.min(totalPages - boundaries, currentPage + siblings)
  if (siblingStart > boundaries + 1) {
    range.push('ellipsis')
  }
  for (let i = siblingStart; i <= siblingEnd; i++) {
    if (!range.includes(i)) range.push(i)
  }
  if (siblingEnd < totalPages - boundaries) {
    range.push('ellipsis')
  }
  for (let i = Math.max(totalPages - boundaries + 1, boundaries + 1); i <= totalPages; i++) {
    if (!range.includes(i)) range.push(i)
  }
  return range
}

function createContent(children: string | false | undefined): Node[][] {
  if (children === false || !children) return []
  return [[document.createTextNode(String(children))]]
}

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding: 24px">
      <h1 style="font-size: 24px; margin-bottom: 24px">Molecule UI Showcase — Angular</h1>
      @for (item of renderSpecs; track item.specIndex) {
        <section
          [attr.data-component]="item.name"
          [attr.data-spec-index]="item.specIndex"
          style="margin-bottom: 32px"
        >
          <h2
            style="font-size: 18px; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 4px"
          >
            {{ item.label }}
          </h2>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start">
            @for (combo of item.combos; track $index) {
              @if (item.component) {
                <ng-container
                  [ngComponentOutlet]="item.component"
                  [ngComponentOutletInputs]="combo.inputs"
                  [ngComponentOutletContent]="combo.content"
                />
              } @else {
                @switch (item.name) {
                  @case ('Card') {
                    <div [class]="cardClass(combo.props)">{{ item.children }}</div>
                  }
                  @case ('Separator') {
                    <div [class]="separatorClass(combo.props)"></div>
                  }
                  @case ('Textarea') {
                    <textarea
                      [class]="textareaClass(combo.props)"
                      [attr.placeholder]="combo.props['placeholder'] || ''"
                      [attr.rows]="combo.props['rows'] || 3"
                    ></textarea>
                  }
                  @case ('Avatar') {
                    <span [class]="avatarClass(combo.props)">
                      <span [class]="cm.avatarFallback">
                        <span [class]="cm.avatarInitials">{{ initials(combo.props['name']) }}</span>
                      </span>
                    </span>
                  }
                  @case ('Progress') {
                    <div [class]="cm.progressWrapper">
                      <div
                        [class]="progressClass(combo.props)"
                        role="progressbar"
                        [attr.aria-valuenow]="combo.props['value']"
                        [attr.aria-valuemin]="0"
                        [attr.aria-valuemax]="combo.props['max'] || 100"
                      >
                        <div
                          [class]="progressBarClass(combo.props)"
                          [style.transform]="progressTransform(combo.props)"
                        ></div>
                      </div>
                    </div>
                  }
                  @case ('Skeleton') {
                    <div
                      [class]="skeletonClass(combo.props)"
                      [attr.style]="skeletonStyle(combo.props)"
                    ></div>
                  }
                  @case ('Table') {
                    <div [class]="cm.tableWrapper">
                      <table [class]="tableClass(combo.props)">
                        <thead [class]="cm.tableHeader">
                          <tr [class]="cm.tableRow">
                            @for (col of asArray(combo.props['columns']); track $index) {
                              <th [class]="tableHeadClass(col)">{{ col.header }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody [class]="cm.tableBody">
                          @for (row of asArray(combo.props['data']); track $index) {
                            <tr [class]="tableRowClass(combo.props, $index)">
                              @for (col of asArray(combo.props['columns']); track $index) {
                                <td [class]="tableCellClass(col)">{{ row[col.key] }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                  @case ('Tabs') {
                    <div>
                      <div role="tablist" [class]="tabsListClass(combo.props)">
                        @for (tab of asArray(combo.props['items']); track tab.value) {
                          <button
                            type="button"
                            role="tab"
                            [attr.aria-selected]="tab.value === activeTabValue(combo.props)"
                            [attr.data-state]="
                              tab.value === activeTabValue(combo.props) ? 'active' : 'inactive'
                            "
                            [attr.disabled]="tab.disabled || null"
                            [class]="tabsTriggerClass(combo.props)"
                          >
                            {{ tab.label }}
                          </button>
                        }
                      </div>
                      @if (activeTabContent(combo.props)) {
                        <div role="tabpanel" [class]="cm.tabsContent">
                          {{ activeTabContent(combo.props) }}
                        </div>
                      }
                    </div>
                  }
                  @case ('Accordion') {
                    <div [class]="cm.accordionRoot">
                      @for (accItem of asArray(combo.props['items']); track accItem.value) {
                        <div
                          [class]="cm.accordionItem"
                          [attr.data-state]="
                            isExpanded(accItem.value, combo.props['defaultValue'])
                              ? 'open'
                              : 'closed'
                          "
                        >
                          <button
                            [class]="accordionTriggerClass()"
                            [attr.aria-expanded]="
                              isExpanded(accItem.value, combo.props['defaultValue'])
                            "
                            [attr.data-state]="
                              isExpanded(accItem.value, combo.props['defaultValue'])
                                ? 'open'
                                : 'closed'
                            "
                          >
                            {{ accItem.header }}
                            <span [innerHTML]="chevronSvg"></span>
                          </button>
                          <div
                            [class]="cm.accordionContent"
                            [attr.data-state]="
                              isExpanded(accItem.value, combo.props['defaultValue'])
                                ? 'open'
                                : 'closed'
                            "
                            [style.display]="
                              isExpanded(accItem.value, combo.props['defaultValue'])
                                ? 'block'
                                : 'none'
                            "
                          >
                            <div [class]="cm.accordionContentInner">{{ accItem.content }}</div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                  @case ('Pagination') {
                    <nav role="navigation" [class]="cm.paginationRoot">
                      <ul [class]="cm.paginationContent">
                        @if (combo.props['showFirstLast']) {
                          <li>
                            <button
                              type="button"
                              [class]="pgItemClass(false, combo.props['size'])"
                              [attr.disabled]="toNum(combo.props['page']) === 1 || null"
                            >
                              <span [innerHTML]="pgIcons['first']"></span>
                            </button>
                          </li>
                        }
                        @if (combo.props['showPrevNext']) {
                          <li>
                            <button
                              type="button"
                              [class]="pgItemClass(false, combo.props['size'])"
                              [attr.disabled]="toNum(combo.props['page']) === 1 || null"
                            >
                              <span [innerHTML]="pgIcons['prev']"></span>
                            </button>
                          </li>
                        }
                        @for (pg of pgRange(combo.props); track $index) {
                          @if (pg === 'ellipsis') {
                            <li>
                              <span [class]="cm.paginationEllipsis" aria-hidden="true">
                                <span [innerHTML]="pgIcons['ellipsis']"></span>
                              </span>
                            </li>
                          } @else {
                            <li>
                              <button
                                type="button"
                                [class]="
                                  pgItemClass(
                                    pg === toNum(combo.props['page']),
                                    combo.props['size']
                                  )
                                "
                                [attr.aria-current]="
                                  pg === toNum(combo.props['page']) ? 'page' : null
                                "
                              >
                                {{ pg }}
                              </button>
                            </li>
                          }
                        }
                        @if (combo.props['showPrevNext']) {
                          <li>
                            <button
                              type="button"
                              [class]="pgItemClass(false, combo.props['size'])"
                              [attr.disabled]="
                                toNum(combo.props['page']) === toNum(combo.props['totalPages']) ||
                                null
                              "
                            >
                              <span [innerHTML]="pgIcons['next']"></span>
                            </button>
                          </li>
                        }
                        @if (combo.props['showFirstLast']) {
                          <li>
                            <button
                              type="button"
                              [class]="pgItemClass(false, combo.props['size'])"
                              [attr.disabled]="
                                toNum(combo.props['page']) === toNum(combo.props['totalPages']) ||
                                null
                              "
                            >
                              <span [innerHTML]="pgIcons['last']"></span>
                            </button>
                          </li>
                        }
                      </ul>
                    </nav>
                  }
                }
              }
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class ShowcaseComponent {
  cm: UIClassMap
  renderSpecs: SpecRender[]
  chevronSvg: SafeHtml
  pgIcons: Record<string, SafeHtml>

  constructor(private sanitizer: DomSanitizer) {
    this.cm = getClassMap()

    this.chevronSvg = this.trustSvg('chevron-down', this.cm.accordionChevron)
    this.pgIcons = {
      first: this.trustSvg('chevrons-left', this.cm.iconSm),
      prev: this.trustSvg('chevron-left', this.cm.iconSm),
      next: this.trustSvg('chevron-right', this.cm.iconSm),
      last: this.trustSvg('chevrons-right', this.cm.iconSm),
      ellipsis: this.trustSvg('ellipsis-horizontal', this.cm.iconSm),
    }

    this.renderSpecs = []
    for (let i = 0; i < showcaseComponents.length; i++) {
      const spec = showcaseComponents[i]
      const comp = componentMap[spec.name] || null
      const hasDupes = showcaseComponents.filter((s) => s.name === spec.name).length > 1
      const combos = generateCombinations(spec.propMatrix).map((combo) => ({
        inputs: { ...(spec.defaultProps || {}), ...combo },
        content: createContent(spec.children),
        props: { ...(spec.defaultProps || {}), ...combo },
      }))

      this.renderSpecs.push({
        name: spec.name,
        specIndex: i,
        label: spec.name + (hasDupes ? ` (${i})` : ''),
        component: comp,
        combos,
        children: spec.children,
      })
    }
  }

  // ── Card ─────────────────────────────────────────────────────────────

  cardClass(props: Record<string, unknown>): string {
    const variant = cardVariantMap[props['variant'] as string] || 'default'
    return this.cm.cn(
      this.cm.card({ variant: variant as 'default' | 'outline' | 'elevated' }),
      this.cm.cardPadding(props['padding']),
    )
  }

  // ── Separator ────────────────────────────────────────────────────────

  separatorClass(props: Record<string, unknown>): string {
    return this.cm.separator({ orientation: props['orientation'] })
  }

  // ── Textarea ─────────────────────────────────────────────────────────

  textareaClass(props: Record<string, unknown>): string {
    return this.cm.textarea({ error: !!props['error'] })
  }

  // ── Avatar ───────────────────────────────────────────────────────────

  avatarClass(props: Record<string, unknown>): string {
    return this.cm.avatar({ size: props['size'] })
  }

  initials(name: unknown): string {
    return String(name || '')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // ── Progress ─────────────────────────────────────────────────────────

  progressClass(props: Record<string, unknown>): string {
    return this.cm.cn(this.cm.progress(), this.cm.progressHeight(props['size']))
  }

  progressBarClass(props: Record<string, unknown>): string {
    return this.cm.cn(this.cm.progressBar(), this.cm.progressColor(props['color']))
  }

  progressTransform(props: Record<string, unknown>): string {
    const value = Number(props['value']) || 0
    const max = Number(props['max']) || 100
    const pct = Math.min(100, Math.max(0, (value / max) * 100))
    return `translateX(-${100 - pct}%)`
  }

  // ── Skeleton ─────────────────────────────────────────────────────────

  skeletonClass(props: Record<string, unknown>): string {
    const anim = props['animation']
    const animClass =
      anim === 'wave' ? this.cm.skeletonWave : anim === 'none' ? this.cm.skeletonNone : ''
    return this.cm.cn(this.cm.skeleton(), animClass)
  }

  skeletonStyle(props: Record<string, unknown>): string {
    const parts: string[] = []
    if (props['width'])
      parts.push(
        `width: ${typeof props['width'] === 'number' ? props['width'] + 'px' : props['width']}`,
      )
    if (props['height'])
      parts.push(
        `height: ${typeof props['height'] === 'number' ? props['height'] + 'px' : props['height']}`,
      )
    return parts.join('; ')
  }

  // ── Table ────────────────────────────────────────────────────────────

  tableClass(props: Record<string, unknown>): string {
    return this.cm.cn(this.cm.table, props['bordered'] && this.cm.tableBordered)
  }

  tableRowClass(props: Record<string, unknown>, index: number): string {
    return this.cm.cn(
      this.cm.tableRow,
      props['striped'] && index % 2 === 1 && this.cm.tableRowStriped,
      props['hoverable'] && this.cm.tableRowHoverable,
    )
  }

  tableHeadClass(col: Record<string, unknown>): string {
    return this.cm.cn(
      this.cm.tableHead,
      col.align === 'center' && this.cm.textCenter,
      col.align === 'right' && this.cm.textRight,
    )
  }

  tableCellClass(col: Record<string, unknown>): string {
    return this.cm.cn(
      this.cm.tableCell,
      col.align === 'center' && this.cm.textCenter,
      col.align === 'right' && this.cm.textRight,
    )
  }

  // ── Tabs ─────────────────────────────────────────────────────────────

  tabsListClass(props: Record<string, unknown>): string {
    return this.cm.cn(this.cm.tabsList, props['fitted'] && this.cm.tabsFitted)
  }

  tabsTriggerClass(props: Record<string, unknown>): string {
    return this.cm.cn(this.cm.tabsTrigger, props['fitted'] && this.cm.tabTriggerFitted)
  }

  activeTabValue(props: Record<string, unknown>): string {
    const items = Array.isArray(props['items']) ? props['items'] : []
    return props['defaultValue'] || (items[0]?.value ?? '')
  }

  activeTabContent(props: Record<string, unknown>): string | null {
    const items = Array.isArray(props['items']) ? props['items'] : []
    const activeValue = this.activeTabValue(props)
    const active = items.find((i: Record<string, unknown>) => i.value === activeValue)
    return active?.content || null
  }

  // ── Accordion ────────────────────────────────────────────────────────

  accordionTriggerClass(): string {
    return this.cm.cn(this.cm.accordion(), this.cm.accordionTriggerBase)
  }

  isExpanded(value: string, defaultValue: unknown): boolean {
    if (!defaultValue) return false
    if (Array.isArray(defaultValue)) return defaultValue.includes(value)
    return defaultValue === value
  }

  // ── Pagination ───────────────────────────────────────────────────────

  pgItemClass(active: boolean, size: unknown): string {
    return this.cm.cn(
      this.cm.pagination({ active, size: (size as string) || 'md' }),
      this.cm.paginationInteractive,
    )
  }

  pgRange(props: Record<string, unknown>): (number | 'ellipsis')[] {
    return paginationRange(Number(props['page']) || 1, Number(props['totalPages']) || 1, 1, 1)
  }

  toNum(val: unknown): number {
    return Number(val) || 0
  }

  // ── Utilities ────────────────────────────────────────────────────────

  asArray(val: unknown): unknown[] {
    return Array.isArray(val) ? val : []
  }

  private trustSvg(iconName: string, className: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(buildIconSvg(iconName, className))
  }
}
