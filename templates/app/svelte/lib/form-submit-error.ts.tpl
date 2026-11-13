/** Read displayable server validation messages without coupling to an HTTP transport. */

/** Narrow a value to a plain object without depending on a transport's error class. */
function record(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Read auth/HTTP response bodies, field-error dictionaries and ordinary failures.
 * Server text is rendered as text by the form; malformed or empty bodies use the fallback.
 *
 * @param error - A rejected submission or a controlled server error.
 * @param fallback - The already translated generic failure message.
 * @returns Nonempty messages suitable for a visible error list.
 */
export function formSubmitErrorMessages(error: unknown, fallback: string): string[] {
  const failure = record(error)
  const body = record(failure?.body ?? record(failure?.response)?.data ?? failure?.data ?? error)
  const errors = body?.errors
  const messages = Array.isArray(errors)
    ? errors.filter(isText)
    : Object.entries(record(errors) ?? {}).flatMap(([field, value]) =>
        (Array.isArray(value) ? value : [value])
          .filter(isText)
          .map((message) => `${field} ${message}`),
      )
  if (messages.length > 0) return messages
  const message = failure?.message ?? body?.message ?? body?.error ?? error
  return [isText(message) ? message : fallback]
}
