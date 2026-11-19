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
  const names = args.map(({ name }) => name)
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

/** Emit one hook over the framework's queue. Commits still go through the resource's cache. */
function resourceToggle(
  binding: ToggleBinding,
  type: string,
  parents: string[],
  name: string,
  setter: string,
  field: string | undefined,
): string {
  const args = [
    ...parents.map((parent) => ({ name: parent, type: 'string' })),
    { name: 'viewer', type: 'string' },
    { name: 'record', type },
    ...(binding.idField ? [] : [{ name: 'id', type: 'string | number' }]),
  ]
  const target = binding.idField ? `recordValue[${JSON.stringify(binding.idField)}]` : 'idValue'
  const send = `${setter}(${[...parents.map((parent) => `${parent}Value`), 'viewerValue', 'id', 'on'].join(', ')})`
  const state = field ? 'boolean' : `{ record: ${type}; desired: boolean | null }`
  const flag = field ? `[${JSON.stringify(field)}] === true` : ''
  const { signature, call } = reactiveOptions(
    binding.observer,
    args,
    `    const id = ${target}\n` +
      (field
        ? `    return {\n      value: recordValue${flag},\n      commit: async (on: boolean): Promise<boolean> => {\n`
        : `    return {\n      value: { record: recordValue, desired: null },\n` +
          `      equals: (a: ${state}, b: ${state}) => a.desired === b.desired && (a.desired !== null || a.record === b.record),\n` +
          `      commit: async ({ desired: on }: ${state}, confirmed: ${state}): Promise<${state}> => {\n` +
          `        if (on === null) return confirmed\n`) +
      `        if (id == null || String(id) === '') throw new Error('A record ID is required')\n` +
      `        return ${field ? `(await ${send})${flag}` : `{ record: await ${send}, desired: on }`}\n` +
      `      },\n    }`,
  )
  const queue = `ReturnType<typeof useOptimisticValue<${state}>>`
  const action = field
    ? '{ toggle: () => void }'
    : `{ set: (on: boolean) => void; toggle: (savedOn: boolean) => void }`
  const recordValue = {
    react: 'queue.value.record',
    vue: 'computed(() => queue.value.value.record)',
    svelte: 'derived(queue.value, (current) => current.record)',
    solid: '() => queue.value().record',
    angular: 'computed(() => queue.value().record)',
  }[binding.framework]
  const result = field
    ? `  return { ...queue, toggle: () => queue.update((on) => !on) }`
    : `  return { value: ${recordValue}, pending: queue.pending, error: queue.error,\n` +
      `    set: (on) => queue.update((current) => ({ ...current, desired: on })),\n` +
      `    toggle: (savedOn) => queue.update((current) => ({ ...current, desired: !(current.desired ?? savedOn) })),\n  }`
  const typeResult = field
    ? queue
    : `Pick<ReturnType<typeof useOptimisticValue<${type}>>, 'value' | 'pending' | 'error'>`
  const description = field
    ? 'Render the hook value and call toggle() on click.'
    : 'Render the saved record in value. Use set(on), or pass the saved flag to toggle(savedOn).'
  return (
    `/** ${description} Keep the control keyed to its viewer and record and leave it enabled during saves. */\n` +
    `export function ${name}(${signature}): ${typeResult} & ${action} {\n` +
    `  const queue = useOptimisticValue<${state}>(${call})\n${result}\n}`
  )
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
}): { source: string; names: string[]; toggleDocs: string[] } {
  const { resource, type, parents } = options
  const call = parents.length ? `${resource}(${parents.join(', ')})` : resource
  const resourceType = parents.length ? `ReturnType<typeof ${resource}>` : `typeof ${resource}`
  const pascal = (name: string): string =>
    name
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  const functions: string[] = []
  const names: string[] = []
  const toggleDocs: string[] = []
  const write = (
    name: string,
    method: string,
    args: string[],
    values: string[],
    result: string,
  ): void => {
    const usage =
      method === 'toggle'
        ? 'Save the desired toggle value and publish the saved record to the query cache. Use the generated toggle hook when available, or call this setter from a queued commit. Await it before navigating or reloading to read the saved change.'
        : `Call ${resource}.${method}; the request body is sent unchanged and tracked reads refresh.`
    names.push(name)
    functions.push(
      `/** ${usage} */\n` +
        `export function ${name}(${[...parents.map((key) => `${key}: string`), 'viewer: string', ...args].join(', ')}): Promise<${result}> {\n` +
        `  return ${call}.${method}(viewer${values.length ? `, ${values.join(', ')}` : ''})\n}`,
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
    )
    const binding = options.toggleBinding
    if (!binding) continue
    names.pop()
    let hook = `use${suffix}`
    while (binding.usedNames.has(hook)) hook += 'Toggle'
    binding.usedNames.add(hook)
    functions.push(resourceToggle(binding, type, parents, hook, setter, field))
    const signature = [...parents, 'viewer', 'record', ...(binding.idField ? [] : ['id'])].join(
      ', ',
    )
    toggleDocs.push(
      `\`${hook}(${signature})\` ${field ? 'shows the desired flag immediately. Render value and call toggle() on click.' : 'shows the saved record in value. Call set(on) or toggle(savedOn).'}`,
    )
  }
  return { source: functions.join('\n\n'), names, toggleDocs }
}
