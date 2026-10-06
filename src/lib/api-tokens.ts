/**
 * Personal API tokens — the local half of `mlcl token create | list | revoke`.
 *
 * The same name and expiry rules the platform enforces are checked here first,
 * so a bad value is refused before any request is sent, and every refusal the
 * platform can answer with is turned into one short sentence that says what to
 * do next.
 */
import { t } from './i18n.js'
import { PlatformApiError, type PlatformApiToken } from './platform.js'

/** Longest token name the platform accepts. */
export const API_TOKEN_NAME_MAX = 60
/** Longest lifetime the platform accepts, in days. */
export const API_TOKEN_EXPIRY_MAX_DAYS = 365
/** Lifetime the platform applies when none is given, in days. */
export const API_TOKEN_EXPIRY_DEFAULT_DAYS = 90

/** A refusal with a message meant for the person running the command. */
export class ApiTokenInputError extends Error {}

/**
 * Check a token name: 1 to 60 characters once surrounding spaces are removed.
 *
 * @param raw - The name as typed.
 * @returns The trimmed name to send.
 */
export function validateApiTokenName(raw: string | undefined): string {
  const name = (raw ?? '').trim()
  if (name.length === 0 || name.length > API_TOKEN_NAME_MAX) {
    throw new ApiTokenInputError(t('commands.token.errors.invalidName'))
  }
  return name
}

/**
 * Check a lifetime in days: a whole number from 1 to 365.
 *
 * @param raw - The flag value as typed, or undefined for the default.
 * @returns The number of days to send.
 */
export function validateApiTokenExpiry(raw: string | undefined): number {
  if (raw === undefined) return API_TOKEN_EXPIRY_DEFAULT_DAYS
  const value = raw.trim()
  const days = /^\d+$/.test(value) ? Number(value) : Number.NaN
  if (!Number.isInteger(days) || days < 1 || days > API_TOKEN_EXPIRY_MAX_DAYS) {
    throw new ApiTokenInputError(t('commands.token.errors.invalidExpiry'))
  }
  return days
}

/**
 * The plain message for a platform refusal of a token request.
 *
 * @param error - What the request threw.
 * @param context - The token name or reference the command was working on.
 * @returns The message, or undefined when the error is not one the token routes send.
 */
export function apiTokenErrorMessage(
  error: unknown,
  context: { name?: string } = {},
): string | undefined {
  if (!(error instanceof PlatformApiError) || !error.errorKey) return undefined
  const key = error.errorKey
  if (key.endsWith('.emailNotConfirmed')) return t('commands.token.errors.emailNotConfirmed')
  switch (key) {
    case 'apiToken.error.invalidName':
      return t('commands.token.errors.invalidName')
    case 'apiToken.error.invalidExpiry':
      return t('commands.token.errors.invalidExpiry')
    case 'apiToken.error.nameTaken':
      return t('commands.token.errors.nameTaken', { name: context.name ?? '' })
    case 'apiToken.error.sessionRequired':
      return t('commands.token.errors.sessionRequired')
    case 'apiToken.error.limit':
      return t('commands.token.errors.limit')
    case 'apiToken.error.dailyLimit':
      return t('commands.token.errors.dailyLimit')
    case 'apiToken.error.notFound':
      return t('commands.token.errors.notFound')
    default:
      return undefined
  }
}

/**
 * Find the one token a reference names: an exact id first, otherwise a name.
 *
 * @param tokens - The caller's tokens, from the list route.
 * @param ref - An id or a name.
 * @returns The matching token.
 */
export function resolveApiToken(tokens: PlatformApiToken[], ref: string): PlatformApiToken {
  const wanted = ref.trim()
  const byId = tokens.find((row) => row.id === wanted)
  if (byId) return byId
  const byName = tokens.filter((row) => row.name === wanted)
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) {
    throw new ApiTokenInputError(
      t('commands.token.errors.ambiguous', {
        name: wanted,
        ids: byName.map((row) => row.id).join(', '),
      }),
    )
  }
  throw new ApiTokenInputError(t('commands.token.errors.noMatch', { ref: wanted }))
}

/**
 * A date for display: the calendar day of an ISO timestamp, in UTC.
 *
 * @param iso - An ISO 8601 timestamp.
 * @returns `YYYY-MM-DD`, or the input unchanged when it is not a date.
 */
export function apiTokenDay(iso: string): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? iso : new Date(time).toISOString().slice(0, 10)
}
