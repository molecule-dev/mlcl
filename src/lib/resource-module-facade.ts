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
    const args = hook.args.map(({ name, type, default: initial }) => {
      const input =
        binding.input === 'getter'
          ? `(${type}) | (() => ${type})`
          : binding.input === 'store'
            ? `(${type}) | Readable<${type}>`
            : type
      return `${name}: ${input}${initial === undefined ? '' : ` = ${initial}`}`
    })
    const read =
      binding.input === 'store'
        ? `derived([${hook.args.map(({ name }) => `resourceStore(${name})`).join(', ')}], ([${hook.args.map(({ name }) => `${name}Value`).join(', ')}]) => ${hook.read})`
        : `${binding.input === 'getter' ? '() => ' : ''}{\n${hook.args
            .map(
              ({ name }) =>
                `    const ${name}Value = ${binding.input === 'getter' ? `typeof ${name} === 'function' ? ${name}() : ` : ''}${name}`,
            )
            .join('\n')}\n    return ${hook.read}\n  }`
    const options =
      binding.input === 'getter' && binding.wrap ? `${binding.wrap.name}(${read})` : read
    return (
      `/** Observe this read; null inputs pause it. Writes below publish the saved record and refresh lists. */\n` +
      `export function ${hook.name}(${args.join(', ')}): ReturnType<typeof ${binding.name}<${hook.result}>> {\n` +
      `  return ${binding.name}(${binding.input === 'value' ? `(() => ${options})()` : options})\n}`
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
  toggles: string[]
}): string {
  const { resource, type, parents } = options
  const call = parents.length ? `${resource}(${parents.join(', ')})` : resource
  const resourceType = parents.length ? `ReturnType<typeof ${resource}>` : `typeof ${resource}`
  const pascal = (name: string): string =>
    name.replace(/(?:^|[-_])([a-z])/g, (_match, letter: string) => letter.toUpperCase())
  const functions: string[] = []
  const write = (
    name: string,
    method: string,
    args: string[],
    values: string[],
    result: string,
  ): void => {
    functions.push(
      `/** Call ${resource}.${method}; the request body is sent unchanged and tracked reads refresh. */\n` +
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
  for (const action of options.toggles)
    write(
      `set${type}${pascal(action)}`,
      'toggle',
      ['id: string | number', 'on: boolean'],
      ['String(id)', JSON.stringify(action), 'on'],
      type,
    )
  return functions.join('\n\n')
}
