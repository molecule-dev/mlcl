/**
 * README.md documentation validator.
 *
 * Validates README.md files against actual source code to detect drift.
 * Used by the `sync-docs` command.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { scanExports } from './scanner.js'
import type { Registry } from './schema.js'

// ============================================================================
// Types
// ============================================================================

export interface DocIssue {
  /** Relative path to the README.md file */
  file: string
  /** Issue category */
  type:
    | 'missing'
    | 'language_count'
    | 'language_list'
    | 'translation_keys'
    | 'exports'
    | 'phantom_class'
    | 'title'
  /** Human-readable description */
  message: string
  /** Whether --fix can auto-resolve this */
  fixable: boolean
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Validate all README.md files in the molecule directory against source.
 */
export async function validateDocs(
  moleculeDir: string,
  registry: Registry,
  filterPackage?: string,
): Promise<DocIssue[]> {
  const issues: DocIssue[] = []

  for (const [name, entry] of Object.entries(registry.packages)) {
    if (filterPackage && name !== filterPackage) continue

    const pkgDir = join(moleculeDir, entry.path)
    const mdPath = join(pkgDir, 'README.md')

    if (!existsSync(mdPath)) {
      issues.push({
        file: `${entry.path}/README.md`,
        type: 'missing',
        message: `README.md is missing — run 'mlcl sync-docs --generate' to create it`,
        fixable: false,
      })
      continue
    }

    const md = readFileSync(mdPath, 'utf-8')
    const srcDir = join(pkgDir, 'src')

    // Title check
    issues.push(...validateTitle(md, name, entry.path))

    // Locale-specific checks
    if (entry.type === 'locales' && existsSync(srcDir)) {
      issues.push(...validateLocaleDoc(md, srcDir, entry.path))
    }

    // Export check (non-locale packages)
    if (entry.type !== 'locales' && existsSync(srcDir)) {
      issues.push(...(await validateExportDoc(md, srcDir, entry.path)))
    }
  }

  return issues
}

// ============================================================================
// Title validation
// ============================================================================

function validateTitle(md: string, packageName: string, path: string): DocIssue[] {
  const issues: DocIssue[] = []
  const titleMatch = md.match(/^#\s+(.+)$/m)

  if (titleMatch) {
    const docTitle = titleMatch[1].trim()
    if (docTitle !== packageName) {
      issues.push({
        file: `${path}/README.md`,
        type: 'title',
        message: `Title "${docTitle}" does not match package name "${packageName}"`,
        fixable: true,
      })
    }
  }

  return issues
}

// ============================================================================
// Locale validation
// ============================================================================

function validateLocaleDoc(md: string, srcDir: string, path: string): DocIssue[] {
  const issues: DocIssue[] = []
  const mdFile = `${path}/README.md`

  // 1. Language file count
  const langFiles = getLangFiles(srcDir)
  const countMatch = md.match(/(\d+)\s+languages?\b/)
  if (countMatch) {
    const docCount = Number.parseInt(countMatch[1], 10)
    if (docCount !== langFiles.length) {
      issues.push({
        file: mdFile,
        type: 'language_count',
        message: `Says ${docCount} languages but has ${langFiles.length} language files`,
        fixable: true,
      })
    }
  }

  // 2. Language list completeness
  const listMatch = md.match(/languages?\s+supported:\s*([a-z, A-Z-]+)\./m)
  if (listMatch) {
    const docLangs = new Set(
      listMatch[1]
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
    )
    const actualLangs = new Set(langFiles)

    for (const lang of actualLangs) {
      if (!docLangs.has(lang)) {
        issues.push({
          file: mdFile,
          type: 'language_list',
          message: `Missing language "${lang}" from language list`,
          fixable: true,
        })
      }
    }
  }

  // 3. Translation key accuracy (compare en.ts keys with table)
  const enPath = join(srcDir, 'en.ts')
  if (existsSync(enPath)) {
    const enContent = readFileSync(enPath, 'utf-8')
    const sourceKeys = parseTranslationKeys(enContent)
    const docKeys = parseDocTranslationKeys(md)

    for (const key of Object.keys(sourceKeys)) {
      if (!docKeys.has(key)) {
        issues.push({
          file: mdFile,
          type: 'translation_keys',
          message: `Missing translation key "${key}" from docs`,
          fixable: true,
        })
      }
    }

    for (const key of docKeys) {
      if (!(key in sourceKeys)) {
        issues.push({
          file: mdFile,
          type: 'translation_keys',
          message: `Phantom translation key "${key}" in docs (not in source)`,
          fixable: true,
        })
      }
    }
  }

  return issues
}

// ============================================================================
// Export validation
// ============================================================================

async function validateExportDoc(md: string, srcDir: string, path: string): Promise<DocIssue[]> {
  const issues: DocIssue[] = []
  const mdFile = `${path}/README.md`

  const actualExports = await scanExports(srcDir)
  if (actualExports.length === 0 || actualExports.includes('*')) return issues

  // Check for phantom class exports
  const classMatches = md.matchAll(/\|\s*`(\w+)`\s*\|\s*`class`/g)
  for (const match of classMatches) {
    const className = match[1]
    if (!actualExports.includes(className)) {
      issues.push({
        file: mdFile,
        type: 'phantom_class',
        message: `Documents class "${className}" but it is not exported`,
        fixable: false,
      })
    }
  }

  return issues
}

// ============================================================================
// Auto-fix functions
// ============================================================================

/**
 * Fix language count text in a README.md string.
 */
export function fixLanguageCount(md: string, actualCount: number): string {
  return md.replace(/(\d+)\s+(languages?\b)/g, `${actualCount} $2`)
}

/**
 * Fix language list in a README.md string.
 */
export function fixLanguageList(md: string, actualLangs: string[]): string {
  const sorted = [...actualLangs].sort((a, b) => a.localeCompare(b))
  const listStr = sorted.join(', ')
  return md.replace(/languages?\s+supported:\s*[a-z, A-Z-]+\./m, `languages supported: ${listStr}.`)
}

/**
 * Fix translation keys section in a README.md string.
 * Replaces the entire Translation Keys section with accurate data from source.
 */
export function fixTranslationKeys(md: string, sourceKeys: Record<string, string>): string {
  const lines = md.split('\n')

  // Strategy 1: Table format (| Key | English |)
  const tableStart = lines.findIndex((l) => l.includes('| Key') && l.includes('| English'))
  if (tableStart !== -1) {
    const separatorIdx = tableStart + 1
    if (separatorIdx < lines.length && lines[separatorIdx].includes('---')) {
      let tableEnd = separatorIdx + 1
      while (tableEnd < lines.length && lines[tableEnd].startsWith('|')) {
        tableEnd++
      }
      const newRows = Object.entries(sourceKeys).map(([key, value]) => `| \`${key}\` | ${value} |`)
      return [...lines.slice(0, separatorIdx + 1), ...newRows, ...lines.slice(tableEnd)].join('\n')
    }
  }

  // Strategy 2: Heading format (### `key`) or bullet format (- `key` - value)
  const sectionStart = lines.findIndex((l) => /^##\s+Translation Keys/.test(l))
  if (sectionStart === -1) return md

  // Find end of section (next ## heading or end of file)
  let sectionEnd = sectionStart + 1
  while (
    sectionEnd < lines.length &&
    !(/^##\s/.test(lines[sectionEnd]) && sectionEnd !== sectionStart)
  ) {
    sectionEnd++
  }

  // Build replacement section as a table
  const newSection = [
    '## Translation Keys',
    '',
    '| Key | English |',
    '|-----|---------|',
    ...Object.entries(sourceKeys).map(([key, value]) => `| \`${key}\` | ${value} |`),
    '',
  ]

  return [...lines.slice(0, sectionStart), ...newSection, ...lines.slice(sectionEnd)].join('\n')
}

// ============================================================================
// Helpers
// ============================================================================

/** Get language file names (without .ts) from src dir, excluding index/types/__tests__ */
function getLangFiles(srcDir: string): string[] {
  try {
    return readdirSync(srcDir)
      .filter(
        (f) =>
          f.endsWith('.ts') &&
          !f.endsWith('.d.ts') &&
          f !== 'index.ts' &&
          f !== 'types.ts' &&
          !f.startsWith('__'),
      )
      .map((f) => f.replace(/\.ts$/, ''))
  } catch (_error) {
    // Safe noop: if the directory is unreadable or absent, returning [] causes the
    // caller to emit no language-list issues — consistent with no locale files found.
    return []
  }
}

/** Parse translation keys from an en.ts file. Returns key -> English value. */
function parseTranslationKeys(content: string): Record<string, string> {
  const keys: Record<string, string> = {}
  // Match: 'key.path': 'English value', or 'key.path': "English value",
  // Also handles multi-line values with template strings
  const pattern = /['"]([^'"]+)['"]\s*:\s*\n?\s*['"]([^'"]+)['"]/g
  for (const match of content.matchAll(pattern)) {
    keys[match[1]] = match[2]
  }
  return keys
}

/** Parse translation keys mentioned in README.md backtick references. */
function parseDocTranslationKeys(md: string): Set<string> {
  const keys = new Set<string>()
  // Key pattern: dotted identifiers with optional hyphens (e.g., battery.not-charging)
  const keyPattern = /[a-zA-Z][a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/
  // Table format: | `key.path` | value |
  for (const match of md.matchAll(/\|\s*`([a-zA-Z][a-zA-Z0-9._-]+)`\s*\|/g)) {
    if (keyPattern.test(match[1])) keys.add(match[1])
  }
  // Bullet format: - `key.path` - value
  for (const match of md.matchAll(/^-\s*`([a-zA-Z][a-zA-Z0-9._-]+)`\s*-/gm)) {
    if (keyPattern.test(match[1])) keys.add(match[1])
  }
  // Heading format: ### `key.path`
  for (const match of md.matchAll(/^###\s*`([a-zA-Z][a-zA-Z0-9._-]+)`/gm)) {
    if (keyPattern.test(match[1])) keys.add(match[1])
  }
  return keys
}
