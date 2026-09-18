/**
 * Substitute the active environment's variables into an outgoing request at send time.
 *
 * Each environment stores a set of `{key, value, enabled}` variables (AES-encrypted JSON, see the
 * environments handler), and exactly one environment is `is_active` per user. The UI tells the user
 * these "swap into requests at send time" and shows a `{{API_TOKEN}}` placeholder — but the execute
 * + monitor-run paths fired the saved URL/headers/body verbatim and never performed the swap, so
 * `{{VAR}}` tokens went out literally. This loads the active environment's enabled variables and
 * replaces `{{KEY}}` placeholders in the URL, header values, and body before the fetch.
 *
 * @module
 */
import { findMany } from '@molecule/api-database'
import { decrypt } from '@molecule/api-encryption'

/** One environment variable as stored in the encrypted `variables` blob. */
interface EnvVariable {
  key: string
  value: string
  enabled?: boolean
}

/**
 * Load the user's ACTIVE environment's enabled variables as a `{key: value}` map. Returns an empty
 * map when there's no active environment or it has no usable variables (also on a decrypt/parse
 * failure — a run should still fire rather than crash). Disabled variables (`enabled === false`) are
 * excluded.
 */
export async function loadActiveEnvVars(userId: string): Promise<Record<string, string>> {
  const rows = await findMany<Record<string, unknown>>('environments', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_active', operator: '=', value: true },
    ],
    limit: 1,
  })
  const active = rows?.[0]
  if (!active || typeof active.variables !== 'string' || active.variables.length === 0) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse((await decrypt(active.variables)) || '[]')
  } catch (_error) {
    // decryption or parse failure — behave as if no variables are set rather than crash the run
    return {}
  }
  const map: Record<string, string> = {}
  if (Array.isArray(parsed)) {
    for (const v of parsed as EnvVariable[]) {
      if (v && typeof v.key === 'string' && v.key.length > 0 && v.enabled !== false) {
        map[v.key] = String(v.value ?? '')
      }
    }
  }
  return map
}

/**
 * Replace `{{KEY}}` placeholders (optional surrounding whitespace) in `text` with the matching
 * variable value from `vars`. Unknown placeholders are left untouched so the user can see which
 * variable was missing.
 */
export function substituteEnvVars(text: string, vars: Record<string, string>): string {
  if (!text || Object.keys(vars).length === 0) return text
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match,
  )
}

/**
 * Substitute env vars into every value of a header map, in place, returning the same object. Header
 * keys are left untouched; only values are rewritten.
 */
export function substituteEnvVarsInHeaders(
  headers: Record<string, string>,
  vars: Record<string, string>,
): Record<string, string> {
  for (const key of Object.keys(headers)) headers[key] = substituteEnvVars(headers[key]!, vars)
  return headers
}
