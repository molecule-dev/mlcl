/**
 * A JSDoc block documents the declaration it sits on.
 *
 * TypeScript — and every editor, hover, and doc tool built on it — attaches
 * ONLY the block immediately above a declaration. A block left one declaration
 * too high (the shape a function move produces: cut the function, paste it
 * lower, leave its doc behind) therefore becomes dead prose that is never shown
 * with the declaration it describes, and the declaration it DOES sit above is
 * then described by the wrong text.
 *
 * That is not cosmetic here. `synthesizeAppProjectFiles` — the function the
 * `mlcl inject` / `create` app path calls to synthesize an app's holistic
 * files — carried the doc of `generateDefaultBondSetup` ("Generates a default
 * bond setup file from registry `defaultBondSetup` metadata …"), while its own
 * doc ("Synthesize holistic project files for App (frontend) projects …") sat
 * orphaned above it, and `scaffoldSecurityWorkflow` / `scaffoldPackage` — both
 * EXPORTED, both covered by mlcl's AGENTS.md rule "JSDoc on all exports" — had
 * no attached doc at all: theirs were orphaned above `ensureAgentsMd` and
 * `moleculeRepository` respectively. A reader (or an agent) asking either of
 * those two what they do was answered with nothing, and asking
 * `synthesizeAppProjectFiles` was answered with a different function's
 * contract.
 *
 * The assertions below read the block the way TypeScript does — the one that
 * ENDS on the line immediately above the declaration — so a doc that drifts one
 * declaration away fails here rather than silently misdescribing the code.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/** The mlcl package root (these modules live in `src/` or `mcp/src/`). */
const ROOT = join(import.meta.dirname, '..', '..', '..')

const MODULES: Record<string, string> = {
  injector: 'src/lib/injector.ts',
  registry: 'src/lib/registry.ts',
  scaffold: 'src/lib/scaffold.ts',
  remote: 'mcp/src/remote.ts',
}

/**
 * The JSDoc block TypeScript attaches to the declaration `declRe` matches, or
 * null when there is none.
 *
 * "Attached" is strict: the block's closing comment marker must be on the line directly
 * above the declaration, which is exactly what a parser sees. A helper that
 * searched further up would pair a doc with a declaration the tooling never
 * shows it with, and would pass on the very shape this file exists to catch.
 *
 * @param module - Key into {@link MODULES}.
 * @param declRe - Matches the declaration's own line.
 * @returns The attached block's text, or null.
 */
function attachedDoc(module: keyof typeof MODULES | string, declRe: RegExp): string | null {
  const rel = MODULES[module]
  if (!rel) throw new Error(`unknown module: ${module}`)
  const lines = readFileSync(join(ROOT, rel), 'utf-8').split('\n')
  const index = lines.findIndex((line) => declRe.test(line))
  if (index < 0) throw new Error(`${rel}: no declaration matched ${String(declRe)}`)
  if (index === 0 || lines[index - 1]!.trim() !== '*/') return null
  let open = index - 2
  while (open >= 0 && !lines[open]!.trim().startsWith('/**')) open--
  if (open < 0) throw new Error(`${rel}: unterminated doc block above line ${index + 1}`)
  return lines.slice(open, index).join('\n')
}

describe('every JSDoc block documents the declaration under it', () => {
  it('synthesizeAppProjectFiles carries ITS OWN doc, not the default-bond-setup one', () => {
    const doc = attachedDoc('injector', /^export function synthesizeAppProjectFiles\(/)
    expect(
      doc,
      'synthesizeAppProjectFiles has no attached JSDoc — its doc drifted one declaration down',
    ).not.toBeNull()
    expect(doc).toContain('Synthesize holistic project files for App')
    // The block that used to sit here described a different function: it is the
    // contract of generateDefaultBondSetup.
    expect(
      doc,
      'synthesizeAppProjectFiles is documented as the default-bond-setup generator',
    ).not.toContain('defaultBondSetup')
  })

  it('generateDefaultBondSetup keeps a doc that describes IT', () => {
    const doc = attachedDoc('injector', /^function generateDefaultBondSetup\(/)
    expect(doc).not.toBeNull()
    expect(doc).toContain('defaultBondSetup')
    // The orphaned copy stated when the generator applies; keep that contract
    // with the function it belongs to rather than losing it with the block.
    expect(doc).toContain('no explicit provider bond exists')
  })

  it('scaffoldSecurityWorkflow keeps its doc — it is an exported surface', () => {
    const doc = attachedDoc('scaffold', /^export async function scaffoldSecurityWorkflow\(/)
    expect(
      doc,
      'the security-workflow doc drifted above ensureAgentsMd, leaving this export undocumented',
    ).not.toBeNull()
    expect(doc).toMatch(/gitleaks|security\.yml|SECURITY\.md/)
    expect(doc).toContain('@param projectName')
  })

  it('scaffoldPackage keeps its doc — it is an exported surface', () => {
    const doc = attachedDoc('scaffold', /^export async function scaffoldPackage\(/)
    expect(doc).not.toBeNull()
    expect(doc).toContain('Scaffold a new molecule package')
    expect(doc).toContain('@param meta')
  })

  it('the raw-registry cache doc sits on the cache it describes', () => {
    const doc = attachedDoc('registry', /^const rawRegistryCache = new Map/)
    expect(doc).not.toBeNull()
    expect(doc).toContain('getRawRegistry')
  })

  it('reads the block TypeScript attaches — not any block further up', () => {
    // Non-vacuousness both ways. A declaration whose doc is immediately above
    // it reads that doc (not a neighbour's)…
    expect(attachedDoc('scaffold', /^export async function ensureAgentsMd\(/)).toContain(
      'AGENTS.md',
    )
    // …and a declaration with no block above it answers null instead of
    // walking up to some earlier function's doc.
    expect(attachedDoc('remote', /^const text = \(/)).toBeNull()
  })
})

/**
 * Every `{@link}` in these modules names something that EXISTS.
 *
 * An unresolvable link is a doc that points at nothing: the reader is sent to an
 * identifier no file declares (an editor renders it as plain text, a doc
 * generator drops it). `acquireRegistryPublishLock`'s doc was such a case —
 * "waited out up to `{@link REGISTRY_LOCK_WAIT_MS}`" — while the code resolves
 * that budget PER CALL from `MLCL_REGISTRY_LOCK_WAIT_MS` through
 * `registryLockWaitMs()`, so no constant of the documented name has ever
 * existed.
 *
 * The check is deliberately weak enough to stay true: a target counts as
 * resolved when ANY module in mlcl declares it (an interface member path like
 * `{@link RegistryStamp.mtimeNs}` resolves on its first segment), so a link to
 * another module's symbol passes and only a name the tree does not declare
 * fails.
 */

/** Every `.ts` module under mlcl's two source trees. */
function sourceModules(): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.ts')) out.push(readFileSync(full, 'utf-8'))
    }
  }
  for (const dir of ['src', 'mcp/src', 'scripts', 'mcp/scripts']) {
    const full = join(ROOT, dir)
    if (existsSync(full)) walk(full)
  }
  return out
}

/** Every name the tree declares (or imports) — the targets a link may use. */
function declaredNames(): Set<string> {
  const names = new Set<string>()
  for (const source of sourceModules()) {
    for (const match of source.matchAll(
      /\b(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
    )) {
      names.add(match[1]!)
    }
    for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const part of match[1]!.split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim()
        if (name) names.add(name)
      }
    }
  }
  return names
}

describe('every {@link} in these modules resolves to a declared name', () => {
  it('names nothing the source tree does not declare', () => {
    const declared = declaredNames()
    const unresolved: string[] = []
    for (const [module, rel] of Object.entries(MODULES)) {
      const source = readFileSync(join(ROOT, rel), 'utf-8')
      for (const match of source.matchAll(/\{@link\s+([A-Za-z_$][\w$]*)/g)) {
        if (!declared.has(match[1]!)) unresolved.push(`${module}: {@link ${match[1]}}`)
      }
    }
    expect(
      unresolved,
      `these docs link to a name no module declares — point the link at the real identifier: ` +
        unresolved.join(', '),
    ).toEqual([])
  })

  it('fails on a name the tree does not declare — the check is not vacuous', () => {
    const declared = declaredNames()
    // The identifier the broken link used: nothing declares it, which is what
    // made the doc a dead end.
    expect(declared.has('REGISTRY_LOCK_WAIT_MS')).toBe(false)
    // …and real identifiers do resolve, so the haystack is being read at all.
    expect(declared.has('registryLockWaitMs')).toBe(true)
    expect(declared.has('clearRegistryCache')).toBe(true)
  })
})
