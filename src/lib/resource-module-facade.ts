/** Named page-facing calls over a generated resource, without another cache or HTTP layer. */
import type { ResourceModuleFactory } from './app-resource-modules.js'

/** One argument of a generated hook. Null pauses the read. */
export interface ResourceHookArgument {
  name: string
  type: string
  default?: string
}

/** A read whose request inputs and result are already described by the owning generator. */
export interface ResourceHook {
  name: string
  args: ResourceHookArgument[]
  result: string
  /** Expression using the arguments' names, each suffixed with `Value`. */
  read: string
}

type QueryBinding = NonNullable<ResourceModuleFactory['queryHook']>

/** Inputs to a framework's observer or optimistic-value hook. */
function reactiveOptions(
  binding: QueryBinding,
  args: ResourceHookArgument[],
  body: string,
  expression = false,
): {
  signature: string
  call: string
} {
  const signature = args
    .map(({ name, type, default: initial }) => {
      const input =
        binding.input === 'getter'
          ? `(${type}) | (() => ${type})`
          : binding.input === 'store'
            ? `(${type}) | Readable<${type}>`
            : type
      return `${name}: ${input}${initial === undefined ? '' : ` = ${initial}`}`
    })
    .join(', ')
  const names = ['viewer', ...args.map(({ name }) => name)]
  const block = `{\n${expression ? `    return ${body}` : body}\n  }`
  if (binding.input === 'store') {
    const stores = names.map((name) => `resourceStore(${name})`).join(', ')
    const values = names.map((name) => `${name}Value`).join(', ')
    return {
      signature,
      call: `derived([${stores}], ([${values}]) => ${expression ? body : block})`,
    }
  }
  const locals = names.map(
    (name) =>
      `    const ${name}Value = ${binding.input === 'getter' ? `typeof ${name} === 'function' ? ${name}() : ` : ''}${name}`,
  )
  const read = `() => {\n${[...locals, expression ? `    return ${body}` : body].join('\n')}\n  }`
  const call =
    binding.input === 'value'
      ? `(${read})()`
      : binding.wrap
        ? `${binding.wrap.name}(${read})`
        : read
  return { signature, call }
}

/**
 * Compose the framework's real observer. Setup-once frameworks must read changed inputs,
 * rather than capture their initial viewer or parent id in a render-style wrapper.
 *
 * @param factory - Registry metadata for the factory and its observer.
 * @param hooks - The contract's reads.
 * @returns Source and imports for the named hooks.
 */
export function resourceHooks(
  factory: ResourceModuleFactory,
  hooks: ResourceHook[],
): {
  source: string
  values: string[]
  storePackage?: string
  wrap?: { name: string; package: string }
} {
  const binding = factory.queryHook
  if (!binding || !hooks.length) return { source: '', values: [] }
  const functions = hooks.map((hook) => {
    const { signature, call } = reactiveOptions(binding, hook.args, hook.read, true)
    return (
      `/** Observe this read; null inputs pause it. Writes below publish the saved record and refresh lists. */\n` +
      `export function ${hook.name}(${signature}): ReturnType<typeof ${binding.name}<${hook.result}>> {\n` +
      `  const viewer = useResourceViewer()\n` +
      `  return ${binding.name}(${call})\n}`
    )
  })
  const store =
    binding.input === 'store'
      ? `/** Keep constant and reactive inputs on the framework's subscription lifecycle. */\n` +
        `function resourceStore<T>(value: T | Readable<T>): Readable<T> {\n` +
        `  return value !== null && typeof value === 'object' && 'subscribe' in value\n` +
        `    ? value as Readable<T>\n    : readable(value as T)\n}\n\n`
      : ''
  return {
    source: store + functions.join('\n\n'),
    values: [binding.name],
    ...(binding.input === 'store' ? { storePackage: binding.package } : {}),
    ...(binding.input === 'getter' && binding.wrap ? { wrap: binding.wrap } : {}),
  }
}

/** A paired POST/DELETE resource action and its known boolean field, when declared. */
interface ResourceToggle {
  action: string
  field?: string
}

/** The framework and record identity available to generated toggle hooks. */
interface ToggleBinding {
  observer: QueryBinding
  framework: NonNullable<ResourceModuleFactory['recordPage']>['framework']
  idField?: string
  usedNames: Set<string>
}

/** A framework's expression for a toggle's visible value, with the named imports it calls. */
interface VisibleValue {
  expression: string
  imports: [from: string, name: string][]
}

/**
 * Emit one hook over the framework's queue. Commits still go through the resource's cache.
 *
 * @returns The hook's source and the named imports its body calls beyond the queue's own.
 */
function resourceToggle(
  binding: ToggleBinding,
  type: string,
  parents: string[],
  name: string,
  setter: string,
  field: string | undefined,
): { source: string; imports: VisibleValue['imports'] } {
  const args = [
    ...parents.map((parent) => ({ name: parent, type: 'string' })),
    { name: 'record', type },
    ...(binding.idField ? [] : [{ name: 'id', type: 'string | number' }]),
  ]
  const target = binding.idField ? `recordValue[${JSON.stringify(binding.idField)}]` : 'idValue'
  const send = `${setter}ForViewer(${['viewerValue', ...parents.map((parent) => `${parent}Value`), 'id', 'on'].join(', ')})`
  const state = field
    ? '{ scope: string; flag: boolean }'
    : `{ scope: string; record: ${type}; desired: boolean | null }`
  const flag = field ? `[${JSON.stringify(field)}] === true` : ''
  const targetScope = [
    'viewerValue',
    ...parents.map((parent) => `${parent}Value`),
    'id == null ? null : String(id)',
  ]
  const { signature, call } = reactiveOptions(
    binding.observer,
    args,
    `    const id = ${target}\n    const scope = JSON.stringify([${targetScope.join(', ')}])\n` +
      (field
        ? `    return {\n      value: { scope, flag: recordValue${flag} },\n      commit: async ({ scope: owner, flag: on }: ${state}): Promise<${state}> => {\n`
        : `    return {\n      value: { scope, record: recordValue, desired: null },\n` +
          `      equals: (a: ${state}, b: ${state}) => a.scope === b.scope && a.desired === b.desired && (a.desired !== null || a.record === b.record),\n` +
          `      commit: async ({ scope: owner, desired: on }: ${state}, confirmed: ${state}): Promise<${state}> => {\n` +
          `        if (on === null) return confirmed\n`) +
      `        if (owner !== scope || viewerValue === null || viewerValue !== getResourceViewer()) throw new Error('The record or session changed.')\n` +
      `        if (id == null || String(id) === '') throw new Error('A record ID is required')\n` +
      `        return ${field ? `{ scope, flag: (await ${send})${flag} }` : `{ scope, record: await ${send}, desired: on }`}\n` +
      `      },\n    }`,
  )
  const action = field
    ? '{ toggle: () => void }'
    : `{ set: (on: boolean) => void; toggle: (savedOn: boolean) => void }`
  const value = field ? 'flag' : 'record'
  // Each expression names what it calls, so a module can never use a helper it did not import.
  // Svelte's `derived` comes with the store package the query binding declares.
  const { expression: visible, imports } = (
    {
      react: { expression: `currentValue(queue.value, options.value).${value}`, imports: [] },
      vue: {
        expression: `computed(() => currentValue(queue.value.value, options().value).${value})`,
        imports: [['vue', 'computed']],
      },
      svelte: {
        expression: `derived([queue.value, options], ([current, next]) => currentValue(current, next.value).${value})`,
        imports: [],
      },
      solid: {
        expression: `() => currentValue(queue.value(), options().value).${value}`,
        imports: [],
      },
      angular: {
        expression: `computed(() => currentValue(queue.value(), options().value).${value})`,
        imports: [['@angular/core', 'computed']],
      },
    } satisfies Record<ToggleBinding['framework'], VisibleValue>
  )[binding.framework]
  const baseline = {
    value: 'options.value',
    getter: 'options().value',
    store: 'get(options).value',
  }[binding.observer.input]
  const result = field
    ? `    update: (change) => update((current) => change(current.flag)),\n` +
      `    toggle: () => update((current) => !current.flag),`
    : `    toggle: (savedOn) => update((current) => !(current.desired ?? savedOn)),`
  const typeResult = field
    ? 'ReturnType<typeof useOptimisticValue<boolean>>'
    : `Pick<ReturnType<typeof useOptimisticValue<${type}>>, 'value' | 'pending' | 'error'>`
  const description = field
    ? 'Render the hook value and call toggle() on click.'
    : 'Render the saved record in value. Use set(on), or pass the saved flag to toggle(savedOn).'
  const source =
    `/** ${description} Leave the control enabled during saves so clicks can queue. */\n` +
    `export function ${name}(${signature}): ${typeResult} & ${action} {\n` +
    `  const viewer = useResourceViewer()\n` +
    `  const options = ${call}\n` +
    `  const queue = useOptimisticValue<${state}>(options)\n` +
    `  const currentValue = (current: ${state}, baseline: ${state}): ${state} => current.scope === baseline.scope ? current : baseline\n` +
    `  const update = (change: (current: ${state}) => boolean): void => {\n` +
    `    const baseline = ${baseline}\n` +
    `    queue.update((queued) => {\n` +
    `      const current = currentValue(queued, baseline)\n` +
    `      return { ...current, ${field ? 'flag' : 'desired'}: change(current) }\n` +
    `    })\n  }\n` +
    `  return { value: ${visible}, pending: queue.pending, error: queue.error,\n` +
    `    set: (on) => update(() => on),\n${result}\n  }\n}`
  return { source, imports }
}

/**
 * Named mutations use the same resource instance as list/detail hooks. Keep the API's body
 * type (including envelopes) and do not invent a mutation for an undeclared route.
 *
 * @param options - The resource and the operations its routes actually support.
 * @returns Named mutation exports.
 */
export function resourceWrites(options: {
  resource: string
  type: string
  parents: string[]
  create: boolean
  createType?: string
  update: boolean
  updateType?: string
  remove: boolean
  toggles: ResourceToggle[]
  toggleBinding?: ToggleBinding
}): { source: string; names: string[]; toggleDocs: string[]; imports: VisibleValue['imports'] } {
  const { resource, type, parents } = options
  const call = `${resource}(${['viewer', ...parents].join(', ')})`
  const resourceType = `ReturnType<typeof ${resource}>`
  const pascal = (name: string): string =>
    name
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  const functions: string[] = []
  const names: string[] = []
  const toggleDocs: string[] = []
  const imports: VisibleValue['imports'] = []
  const write = (
    name: string,
    method: string,
    args: string[],
    values: string[],
    result: string,
    toggleHook = false,
  ): void => {
    const usage =
      method === 'toggle'
        ? 'Save the desired toggle value and publish the saved record to the query cache. Use the generated toggle hook when available, or call this setter from a queued commit. Await it before navigating or reloading to read the saved change.'
        : `Call ${resource}.${method}; the request body is sent unchanged and tracked reads refresh.`
    names.push(name)
    const params = [...parents.map((key) => `${key}: string`), ...args].join(', ')
    const innerArgs = [...parents, ...args.map((arg) => arg.split(':')[0])]
    const invoke = `${call}.${method}(viewer${values.length ? `, ${values.join(', ')}` : ''})`
    if (toggleHook) {
      functions.push(
        `function ${name}ForViewer(viewer: string, ${params}): Promise<${result}> {\n` +
          `  return ${invoke}\n}`,
      )
    }
    functions.push(
      `/** ${usage} */\n` +
        `export async function ${name}(${params}): Promise<${result}> {\n` +
        `  const viewer = getWriteViewer()\n` +
        `  return ${toggleHook ? `${name}ForViewer(${['viewer', ...innerArgs].join(', ')})` : invoke}\n}`,
    )
  }
  if (options.create)
    write(
      `create${type}`,
      'create',
      [`input: ${options.createType ?? `Parameters<${resourceType}['create']>[1]`}`],
      ['input'],
      type,
    )
  if (options.update)
    write(
      `update${type}`,
      'update',
      [
        'id: string | number',
        `input: ${options.updateType ?? `Parameters<${resourceType}['update']>[2]`}`,
      ],
      ['String(id)', 'input'],
      type,
    )
  if (options.remove)
    write(`delete${type}`, 'remove', ['id: string | number'], ['String(id)'], 'void')
  const usedSetters = new Set(names)
  for (const { action, field } of options.toggles) {
    const suffix = `${type}${pascal(action)}`
    let setter = `set${suffix}`
    while (usedSetters.has(setter)) setter += 'Value'
    usedSetters.add(setter)
    write(
      setter,
      'toggle',
      ['id: string | number', 'on: boolean'],
      ['String(id)', JSON.stringify(action), 'on'],
      type,
      options.toggleBinding !== undefined,
    )
    const binding = options.toggleBinding
    if (!binding) continue
    names.pop()
    let hook = `use${suffix}`
    while (binding.usedNames.has(hook)) hook += 'Toggle'
    binding.usedNames.add(hook)
    const toggle = resourceToggle(binding, type, parents, hook, setter, field)
    functions.push(toggle.source)
    imports.push(...toggle.imports)
    const signature = [...parents, 'record', ...(binding.idField ? [] : ['id'])].join(', ')
    toggleDocs.push(
      `\`${hook}(${signature})\` ${field ? 'shows the desired flag immediately. Render value and call toggle() on click.' : 'shows the saved record in value. Call set(on) or toggle(savedOn).'}`,
    )
  }
  return { source: functions.join('\n\n'), names, toggleDocs, imports }
}
