/**
 * Local .env store used by `mlcl env` — a minimal, format-preserving
 * KEY=VALUE parser/writer that understands comments and blank lines and
 * never rewrites lines it did not change. Monorepo-aware: a full-stack
 * scaffold keeps api/.env and app/.env, so callers address a workspace.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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

export function setEnvValue(file: EnvFile, key: string, value: string): boolean {
  const existing = file.entries.find((e) => e.key === key && !e.commented)
  if (existing) {
    const lines = file.raw.split('\n')
    lines[existing.line - 1] = `${key}=${value}`
    file.raw = lines.join('\n')
    existing.value = value
    return false
  }
  const prefix = file.raw.length > 0 && !file.raw.endsWith('\n') ? '\n' : ''
  file.raw = `${file.raw}${prefix}${key}=${value}\n`
  file.entries.push({ key, value, commented: false, line: file.raw.split('\n').length - 1 })
  return true
}

export function unsetEnvValue(file: EnvFile, key: string): boolean {
  const existing = file.entries.find((e) => e.key === key && !e.commented)
  if (!existing) return false
  const lines = file.raw.split('\n')
  lines[existing.line - 1] = `# ${key}=${existing.value}`
  file.raw = lines.join('\n')
  existing.commented = true
  return true
}

export function saveEnvFile(file: EnvFile): void {
  writeFileSync(file.path, file.raw)
}

/** The default .env path for a workspace: cwd-relative api/.env or app/.env, else .env. */
export function defaultEnvPath(workspace?: string): string {
  const base = workspace ?? process.cwd()
  if (existsSync(join(base, 'api', 'package.json'))) return join(base, 'api', '.env')
  if (existsSync(join(base, 'app', 'package.json'))) return join(base, 'app', '.env')
  return join(base, '.env')
}
