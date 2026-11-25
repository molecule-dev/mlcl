/**
 * Add one named entry to an agent's JSON or JSONC config file without
 * disturbing anything else in it.
 *
 * Agent configs are user files: VS Code, Zed and OpenCode allow comments and
 * trailing commas, and a rewrite through `JSON.parse`/`JSON.stringify` would
 * delete the comments (or fail on them). `jsonc-parser` edits the text in
 * place, so comments, key order and formatting survive.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import {
  applyEdits,
  findNodeAtLocation,
  getNodeValue,
  modify,
  type ParseError,
  parseTree,
  printParseErrorCode,
} from 'jsonc-parser'

/** What {@link mergeJsonConfigEntry} did. */
export type JsonEntryResult =
  /** The file did not exist and now holds the entry. */
  | 'created'
  /** The entry was added to an existing file. */
  | 'added'
  /** The entry existed and gained keys it lacked. */
  | 'updated'
  /** The entry was already there with every key. */
  | 'present'

/**
 * Compute the new file text with `entry` set at `keys` + `name`.
 *
 * An existing entry is never overwritten: only keys it lacks are added, so a
 * user's own settings for the server (an `env`, a pinned version) are kept. The one exception is
 * an entry an older setup wrote: when every key of `legacy` holds exactly that value, the keys of
 * `entry` replace the entry's (its other keys stay).
 *
 * @param text - The file's current text (`''` for a new file).
 * @param keys - The key path the entries live under (`['mcpServers']`).
 * @param name - The entry's name (`molecule`).
 * @param entry - The entry's value.
 * @param legacy - The keys an older setup wrote, which mark the entry as replaceable.
 * @returns The new text and what changed.
 * @throws When the text does not parse, or a key on the path holds something
 *   other than an object.
 */
export function renderJsonConfigEntry(
  text: string,
  keys: string[],
  name: string,
  entry: Record<string, unknown>,
  legacy?: Record<string, unknown>,
): { text: string; result: Exclude<JsonEntryResult, 'created'> } {
  const source = text.trim() === '' ? '{}\n' : text
  const errors: ParseError[] = []
  const root = parseTree(source, errors, { allowTrailingComma: true, disallowComments: false })
  if (errors.length > 0 || !root) {
    const first = errors[0]
    throw new Error(
      `it is not valid JSON${first ? ` (${printParseErrorCode(first.error)} at offset ${first.offset})` : ''}`,
    )
  }
  if (root.type !== 'object') throw new Error('its top level is not an object')
  for (let depth = 1; depth <= keys.length; depth++) {
    const node = findNodeAtLocation(root, keys.slice(0, depth))
    if (node && node.type !== 'object')
      throw new Error(`"${keys.slice(0, depth).join('.')}" is not an object`)
  }
  const formattingOptions = {
    insertSpaces: !/^\t/m.test(source),
    tabSize: 2,
    eol: source.includes('\r\n') ? '\r\n' : '\n',
  }
  const existing = findNodeAtLocation(root, [...keys, name])
  if (!existing) {
    const edits = modify(source, [...keys, name], entry, { formattingOptions })
    return { text: applyEdits(source, edits), result: 'added' }
  }
  if (existing.type !== 'object') throw new Error(`"${[...keys, name].join('.')}" is not an object`)
  const current = getNodeValue(existing) as Record<string, unknown>
  const replace =
    legacy !== undefined &&
    Object.entries(legacy).every(
      ([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value),
    )
  let out = source
  for (const [key, value] of Object.entries(entry)) {
    if (key in current && (!replace || JSON.stringify(current[key]) === JSON.stringify(value)))
      continue
    out = applyEdits(out, modify(out, [...keys, name, key], value, { formattingOptions }))
  }
  return { text: out, result: out === source ? 'present' : 'updated' }
}

/**
 * Add `entry` under `keys` + `name` in a JSON/JSONC file, creating the file
 * (and its directory) when it does not exist.
 *
 * @param path - The config file.
 * @param keys - The key path the entries live under.
 * @param name - The entry's name.
 * @param entry - The entry's value.
 * @param legacy - The keys an older setup wrote (see {@link renderJsonConfigEntry}).
 * @returns What changed.
 * @throws When the existing file cannot be edited safely (see {@link renderJsonConfigEntry}).
 */
export function mergeJsonConfigEntry(
  path: string,
  keys: string[],
  name: string,
  entry: Record<string, unknown>,
  legacy?: Record<string, unknown>,
): JsonEntryResult {
  const existed = existsSync(path)
  const before = existed ? readFileSync(path, 'utf8') : ''
  const { text, result } = renderJsonConfigEntry(before, keys, name, entry, legacy)
  if (result === 'present') return result
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text.endsWith('\n') ? text : `${text}\n`)
  return existed && before.trim() !== '' ? result : 'created'
}

/**
 * Whether the entry at `keys` + `name` in a JSON/JSONC file has every key of `match` with
 * exactly that value. A missing or unreadable file has no such entry.
 *
 * @param path - The config file.
 * @param keys - The key path the entries live under.
 * @param name - The entry's name.
 * @param match - The keys and values to compare.
 * @returns True when the entry matches.
 */
export function jsonConfigEntryMatches(
  path: string,
  keys: string[],
  name: string,
  match: Record<string, unknown>,
): boolean {
  if (!existsSync(path)) return false
  const root = parseTree(readFileSync(path, 'utf8'), [], {
    allowTrailingComma: true,
    disallowComments: false,
  })
  const node = root && findNodeAtLocation(root, [...keys, name])
  if (!node || node.type !== 'object') return false
  const current = getNodeValue(node) as Record<string, unknown>
  return Object.entries(match).every(
    ([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value),
  )
}
