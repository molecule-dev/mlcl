/** Bind QueryContent's loaded branch to a named detail hook. */
import type { ResourceModuleFactory } from './app-resource-modules.js'
import type { ResourceHook } from './resource-module-facade.js'

/** The module's view, plus a native component file when the framework requires one. */
export interface ResourceRecordView {
  doc: string
  source?: string
  imports?: readonly [from: string, names: string[]]
  file?: { name: string; source: string }
}

type Framework = NonNullable<ResourceModuleFactory['recordPage']>['framework']

/**
 * Render the detail query with the framework's QueryContent component. The requested identity
 * keys the entire loaded branch, including when both records are already cached.
 *
 * @param framework - The presentation syntax the factory declares.
 * @param queryPackage - The declared query factory and QueryContent package.
 * @param collection - The resource module's filename stem.
 * @param record - The loaded record type.
 * @param detail - The named detail hook and its inputs.
 * @returns The view's source, imports and module header example.
 */
export function resourceRecordView(
  framework: Framework,
  queryPackage: string,
  collection: string,
  record: string,
  detail: ResourceHook,
): ResourceRecordView {
  const name = `${record}View`
  const props = `${name}Props`
  const args = detail.args.map(({ name }) => name)
  const types = detail.args.map(({ name, type }) => `  ${name}: ${type}`).join('\n')
  const key = (viewer: string, values: string[]): string => {
    const id = values.at(-1)!
    return `JSON.stringify([${[viewer, ...values.slice(0, -1), `${id} == null ? null : String(${id})`].join(', ')}])`
  }
  const doc = `Detail pages use \`${name}\` with ${args.map((arg) => `\`${arg}\``).join(', ')} and loaded-record content. Pass pending, missing and error content to the view.`
  const jsx = `\`<${name} ${args.map((arg) => `${arg}={${arg}}`).join(' ')}>{renderRecord}</${name}>\``
  const description = `/** Render ${record} content only after the requested record loads. */`
  const slots = `Pick<QueryContentProps<${record}>, 'children' | 'pending' | 'missing' | 'error'>`
  const shape = `type ${props} = ${slots} & {\n${types}\n}`
  const fromProps = args.map((arg) => `props.${arg}`)
  const fromSignals = args.map((arg) => `this.${arg}()`)
  const fromGetters = fromProps.map((value) => `() => ${value}`)
  const call = (values: string[]): string => `${detail.name}(${values.join(', ')})`

  switch (framework) {
    case 'react':
      return {
        doc: `Detail pages use ${jsx}. Put the page markup in renderRecord. Pass pending, missing and error content to the view.`,
        imports: ['react', ['createElement', 'type ReactNode']],
        source: `${shape}\n\n${description}
export function ${name}(props: ${props}): ReactNode {
  const viewer = useResourceViewer()
  const query = ${call(fromProps)}
  return createElement(QueryContent<${record} | null>, { ...props, query, recordKey: ${key('viewer', fromProps)} })
}`,
      }
    case 'solid':
      return {
        doc: `Detail pages use ${jsx}. Read the record accessor in renderRecord. Pass pending, missing and error content to the view.`,
        imports: ['solid-js', ['createComponent', 'type JSX', 'mergeProps']],
        source: `${shape}\n\n${description}
export function ${name}(props: ${props}): JSX.Element {
  const viewer = useResourceViewer()
  const query = ${call(fromGetters)}
  return createComponent(QueryContent<${record} | null>, mergeProps(props, {
    query,
    get recordKey() { return ${key('viewer()', fromProps)} },
  }))
}`,
      }
    case 'vue':
      return {
        doc: `${doc} Pass the loaded-record renderer as the children prop.`,
        imports: ['vue', ['defineComponent', 'h']],
        source: `${shape}\n\n${description}
export const ${name} = defineComponent((props: ${props}) => {
  const viewer = useResourceViewer()
  const query = ${call(fromGetters)}
  return () => h(QueryContent<${record} | null>, { ...props, query: query.value, recordKey: ${key('viewer()', fromProps)} })
}, { props: ${JSON.stringify([...args, 'children', 'pending', 'missing', 'error'])} })`,
      }
    case 'angular': {
      const selector = `mol-${collection.replaceAll('_', '-')}-view`
      return {
        doc: `${doc} Import \`${name}\` and pass the loaded template through \`[children]\` on \`<${selector}>\`.`,
        imports: ['@angular/core', ['Component', 'input']],
        source: `${description}
@Component({
  selector: '${selector}',
  standalone: true,
  imports: [QueryContent],
  template: '<mol-query-content [query]="query" [recordKey]="recordKey()" [children]="children()" [pending]="pending()" [missing]="missing()" [error]="error()" />',
})
export class ${name} {
${detail.args.map(({ name, type }) => `  readonly ${name} = input<${type}>(null)`).join('\n')}
  readonly children = input.required<QueryContentProps<${record}>['children']>()
  readonly pending = input<NonNullable<QueryContentProps<${record}>['pending']> | null>(null)
  readonly missing = input<NonNullable<QueryContentProps<${record}>['missing']> | null>(null)
  readonly error = input<NonNullable<QueryContentProps<${record}>['error']> | null>(null)
  private readonly viewer = useResourceViewer()
  protected readonly query = ${call(fromSignals.map((value) => `() => ${value}`))}
  protected readonly recordKey = computed(() => ${key('this.viewer()', fromSignals)})
}`,
      }
    }
    case 'svelte': {
      const filename = `${collection}-view.svelte`
      return {
        doc: `${doc} Import it from \`./${filename}\` and supply a children snippet.`,
        file: {
          name: filename,
          source: `<script lang="ts">
  import { toStore } from 'svelte/store'

  import { QueryContent, type QueryContentProps } from '${queryPackage}'

  import { type ${record}, ${detail.name}, useResourceViewer } from './${collection}.js'

  ${shape.replaceAll('\n', '\n  ')}

  const { ${args.join(', ')}, children, pending, missing, error }: ${props} = $props()
  const viewer = useResourceViewer()
  const query = ${call(args.map((arg) => `toStore(() => ${arg})`))}
</script>

<QueryContent {query} recordKey={${key('$viewer', args)}} {children} {pending} {missing} {error} />
`,
        },
      }
    }
  }
}
