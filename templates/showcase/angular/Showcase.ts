import { NgComponentOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, reflectComponentType, type Type } from '@angular/core'

import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Pagination,
  Progress,
  RadioGroup,
  Select,
  Separator,
  Skeleton,
  Spinner,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
} from '@molecule/app-ui-angular'
import { generateCombinations, showcaseComponents } from '@molecule/app-ui-showcase'

/**
 * The kit's components, by the catalogue name that renders them, in the catalogue's order.
 * The catalogue supplies each component's own props at this dynamic boundary.
 */
const components: Record<string, Type<unknown>> = {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  Switch,
  Badge,
  Avatar,
  Table,
  Tabs,
  Accordion,
  Pagination,
  Alert,
  Spinner,
  Progress,
  Skeleton,
  Toast,
  Card,
  Separator,
}

/** One prop combination of a catalogue entry. */
interface ComboRender {
  /** The combination's props, those the component declares as inputs. */
  inputs: Record<string, unknown>
  /** The entry's text children, in the slot of the component's catch-all content. */
  content: Node[][]
}

/** One catalogue entry, ready to render. */
interface SpecRender {
  name: string
  specIndex: number
  label: string
  component: Type<unknown>
  combos: ComboRender[]
}

/**
 * The props a component declares as inputs. Angular refuses an input a dynamically created
 * component does not declare: a catalogue callback (`onChange`) is an output in the Angular kit,
 * not an input.
 *
 * @param component - The kit's component.
 * @param props - The entry's default props merged with the combination's props.
 * @returns The props the component takes as inputs.
 */
function declaredInputs(
  component: Type<unknown>,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const mirror = reflectComponentType(component)
  if (!mirror) throw new Error(`${component.name} is not an Angular component`)
  const declared = new Set(mirror.inputs.map((input) => input.templateName))
  return Object.fromEntries(Object.entries(props).filter(([name]) => declared.has(name)))
}

/**
 * Text children, where the same text goes between a component's tags: the catch-all content
 * slot. `ngComponentOutlet` hands each list to the content slot of the same index, and a
 * component with named slots keeps its catch-all last.
 *
 * @param component - The kit's component.
 * @param children - The entry's text children.
 * @returns The lists to project, one per slot up to the catch-all.
 */
function projectedContent(component: Type<unknown>, children: string): Node[][] {
  const slot = reflectComponentType(component)?.ngContentSelectors.indexOf('*') ?? -1
  // A component without a catch-all slot has nowhere to render text children.
  if (slot === -1) return []
  const content: Node[][] = []
  content[slot] = [document.createTextNode(children)]
  return content
}

/**
 * The catalogue's entries, each with every prop combination the entry defines.
 *
 * @returns One item per catalogue entry the kit has a component for.
 */
function buildRenderSpecs(): SpecRender[] {
  const specs: SpecRender[] = []
  for (const [specIndex, spec] of showcaseComponents.entries()) {
    const component = components[spec.name]
    // A name the kit does not export renders no section, and the visual spec fails naming it.
    if (!component) continue
    const hasDupes = showcaseComponents.filter((s) => s.name === spec.name).length > 1
    const children = typeof spec.children === 'string' ? spec.children : ''
    specs.push({
      name: spec.name,
      specIndex,
      label: spec.name + (hasDupes ? ` (${specIndex})` : ''),
      component,
      combos: generateCombinations(spec.propMatrix).map((combo) => ({
        inputs: declaredInputs(component, { ...spec.defaultProps, ...combo }),
        content: children ? projectedContent(component, children) : [],
      })),
    })
  }
  return specs
}

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding: 24px">
      <h1 style="font-size: 24px; margin-bottom: 24px">Molecule UI Showcase</h1>
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
              <ng-container
                [ngComponentOutlet]="item.component"
                [ngComponentOutletInputs]="combo.inputs"
                [ngComponentOutletContent]="combo.content"
              />
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class ShowcaseComponent {
  readonly renderSpecs = buildRenderSpecs()
}
