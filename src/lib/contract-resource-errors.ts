/** Generate one message reader for the JSON error responses a resource declares. */
type JsonObject = Record<string, unknown>
type MessagePath = (string | null)[]

const object = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Find declared message strings, including lists of validation messages and field maps.
 * A null step selects the entries of an array or the values of an additionalProperties map.
 *
 * @param schemas - The resource's non-success JSON response schemas.
 * @param resolve - Follow the contract's local schema references.
 * @returns Unique message paths in display order.
 */
export function resourceErrorPaths(
  schemas: unknown[],
  resolve: (schema: unknown) => unknown,
): MessagePath[] {
  const paths = new Map<string, MessagePath>()
  const messages = ['message', 'detail', 'error', 'title']
  const visit = (
    schema: unknown,
    path: MessagePath,
    fieldErrors: boolean,
    seen: Set<object>,
  ): void => {
    schema = resolve(schema)
    if (!object(schema) || seen.has(schema)) return
    const nested = new Set(seen).add(schema)
    if (
      schema.type === 'string' &&
      (fieldErrors || path.length === 0 || messages.includes(path.at(-1) ?? ''))
    )
      paths.set(JSON.stringify(path), path)
    for (const key of ['oneOf', 'anyOf', 'allOf']) {
      const choices = schema[key]
      if (Array.isArray(choices))
        for (const choice of choices) visit(choice, path, fieldErrors, nested)
    }
    if (schema.items) visit(schema.items, [...path, null], fieldErrors || path.length === 0, nested)
    if (fieldErrors && schema.additionalProperties)
      visit(schema.additionalProperties, [...path, null], true, nested)
    if (object(schema.properties)) {
      const names = new Set([...messages, ...Object.keys(schema.properties)])
      for (const name of names)
        visit(schema.properties[name], [...path, name], fieldErrors || name === 'errors', nested)
    }
  }
  for (const schema of schemas) visit(schema, [], false, new Set())
  // Also support the HTTP package's conventional error/message envelope if a server returns
  // it for an unlisted status. Do not surface the transport error or arbitrary response fields.
  for (const name of ['error', 'message']) paths.set(JSON.stringify([name]), [name])
  return [...paths.values()]
}

/**
 * Emit the UI-facing helper without wrapping or changing the error thrown by the HTTP bond.
 *
 * @param name - The helper exported by this resource module.
 * @param paths - The string locations found in the response schemas.
 * @returns The generated TypeScript.
 */
export function resourceErrorMessage(name: string, paths: MessagePath[]): string {
  return `function messageAt(value: unknown, path: readonly (string | null)[], index = 0): string | undefined {
  if (index === path.length)
    return typeof value === 'string' && value.trim() ? value : undefined
  if (value === null || typeof value !== 'object') return undefined
  const key = path[index]
  if (key !== null)
    return Object.hasOwn(value, key) ? messageAt(Reflect.get(value, key), path, index + 1) : undefined
  for (const item of Object.values(value)) {
    const message = messageAt(item, path, index + 1)
    if (message !== undefined) return message
  }
  return undefined
}

/** Read a server validation message or supply localized fallback text. */
export function ${name}(error: unknown, fallback = 'Request failed. Please try again.'): string {
  if (!(error instanceof HttpError) || error.status === 0 || !error.response) return fallback
  const paths: (string | null)[][] = ${JSON.stringify(paths)}
  for (const path of paths) {
    const message = messageAt(error.response.data, path)
    if (message !== undefined) return message
  }
  return fallback
}`
}
