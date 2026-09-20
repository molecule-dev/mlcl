/**
 * Local .env store used by `mlcl env` — a minimal, format-preserving
 * KEY=VALUE parser/writer that understands comments and blank lines and
 * never rewrites lines it did not change. Monorepo-aware: a full-stack
 * scaffold keeps api/.env and app/.env, so callers address a workspace.
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface EnvEntry {
  key: string
  value: string
  commented: boolean
  /** 1-based line in the file. */
  line: number
}

export interface EnvFile {
  path: string
  entries: EnvEntry[]
  raw: string
}

const ENV_LINE = /^(#)?\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/

export function loadEnvFile(path: string): EnvFile {
  const raw = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const entries: EnvEntry[] = []
  raw.split('\n').forEach((line, i) => {
    const match = ENV_LINE.exec(line)
    if (match) {
      entries.push({
        commented: match[1] === '#',
        key: match[2],
        value: stripQuotes(match[3]),
        line: i + 1,
      })
    }
  })
  return { path, entries, raw }
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * Dotenv-safe write form: single-quote values that contain whitespace, `#`,
 * or quotes (single-quoted dotenv values keep ` # ` from becoming a comment
 * and preserve interior spacing); escape interior single quotes as '\''.
 */
function quoteValue(value: string): string {
  if (/^[A-Za-z0-9._/@:+-]*$/.test(value)) return value
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export function setEnvValue(file: EnvFile, key: string, value: string): boolean {
  // A newline in a value would inject additional KEY=VALUE lines into the
  // .env (env-file poisoning — reachable from `env pull` remote values too).
  // Values are single-line by contract; refuse rather than escape.
  if (/[\n\r]/.test(value)) {
    throw new Error('env values must be single-line (no \\n or \\r)')
  }
  const written = quoteValue(value)
  const existing = file.entries.find((e) => e.key === key && !e.commented)
  if (existing) {
    const lines = file.raw.split('\n')
    lines[existing.line - 1] = `${key}=${written}`
    file.raw = lines.join('\n')
    existing.value = value
    return false
  }
  const prefix = file.raw.length > 0 && !file.raw.endsWith('\n') ? '\n' : ''
  file.raw = `${file.raw}${prefix}${key}=${written}\n`
  file.entries.push({ key, value, commented: false, line: file.raw.split('\n').length - 1 })
  return true
}

export function unsetEnvValue(file: EnvFile, key: string): boolean {
  const existing = file.entries.find((e) => e.key === key && !e.commented)
  if (!existing) return false
  if (/[\n\r]/.test(existing.value)) {
    throw new Error('refusing to unset a multi-line value — fix the .env by hand')
  }
  const lines = file.raw.split('\n')
  lines[existing.line - 1] = `# ${key}=${quoteValue(existing.value)}`
  file.raw = lines.join('\n')
  existing.commented = true
  return true
}

export function saveEnvFile(file: EnvFile): void {
  // 0600 — .env carries provider secrets (same standard as scaffold.ts).
  writeFileSync(file.path, file.raw, { mode: 0o600 })
  chmodSync(file.path, 0o600)
}

/** The default .env path for a workspace: cwd-relative api/.env or app/.env, else .env. */
export function defaultEnvPath(workspace?: string): string {
  const base = workspace ?? process.cwd()
  if (existsSync(join(base, 'api', 'package.json'))) return join(base, 'api', '.env')
  if (existsSync(join(base, 'app', 'package.json'))) return join(base, 'app', '.env')
  return join(base, '.env')
}
