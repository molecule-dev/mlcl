/**
 * After `mlcl add`, a provider points at its core's API, not its own README. In the 2026-11-23 add
 * eval an agent that had read `@molecule/api-uploads` was sent on to the filesystem provider's
 * README too, and spent a model turn on it.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

import { describe, expect, it } from 'vitest'

import {
  addedDeclarations,
  afterAddGuidance,
  installedPackageDir,
  quickStartDeclarations,
} from '../add-guidance.js'
import { missingMoleculePeers } from '../peer-closure.js'
import { getRawRegistry } from '../registry.js'
import type { Registry } from '../schema.js'

// chalk colours nothing off a terminal, but strip any escape codes so the assertions read the text.
const plain = (lines: string[]): string[] => lines.map((line) => stripVTControlCharacters(line))

/** The CLI's registry with one package's Quick Start set, or every Quick Start removed. */
function registryWith(quickStarts: Record<string, string> = {}): Registry {
  const registry = structuredClone(getRawRegistry())
  for (const entry of Object.values(registry.packages)) delete entry.quickStart
  for (const [name, code] of Object.entries(quickStarts)) registry.packages[name]!.quickStart = code
  return registry
}
const bare = registryWith()

describe('what mlcl add says about using the package', () => {
  it("sends a provider's reader to the core it implements", () => {
    const lines = plain(afterAddGuidance('@molecule/api-uploads-filesystem', [], bare))
    expect(lines).toEqual([
      'Your code calls it through @molecule/api-uploads. Read that API: npx mlcl docs @molecule/api-uploads',
    ])
  })

  it('names the environment variables a provider reads', () => {
    const secrets = getRawRegistry().packages['@molecule/api-payments-stripe']?.secrets ?? []
    expect(secrets.length).toBeGreaterThan(0)
    const [, env] = plain(afterAddGuidance('@molecule/api-payments-stripe', [], bare))
    expect(env).toBe(
      `It reads these environment variables: ${secrets.map((secret) => secret.name).join(', ')}`,
    )
  })

  it('marks an optional variable', () => {
    const [, env] = plain(afterAddGuidance('@molecule/api-activity-http', [], bare))
    expect(env).toBe('It reads these environment variables: MOLECULE_ACTIVITY_URL (optional)')
  })

  it('points a package that implements nothing at its own API', () => {
    expect(
      plain(afterAddGuidance('@molecule/api-uploads', ['@molecule/api-uploads-filesystem'], bare)),
    ).toEqual(['Read its API before using it: npx mlcl docs @molecule/api-uploads'])
  })

  it('names the providers of a core the project has none of (OLD MUSTFAIL)', () => {
    // The add eval: an agent added @molecule/api-uploads, heard nothing about a provider, and found
    // out from a README that every call would fail until it added one.
    const registry = getRawRegistry().packages
    const providers = Object.entries(registry)
      .filter(([, entry]) => entry.implements === '@molecule/api-ai' && !entry.replacedBy)
      .map(([name, entry]) => `${name} (${entry.label})`)
    expect(providers.length).toBeGreaterThan(1)
    const lines = plain(afterAddGuidance('@molecule/api-ai', ['@molecule/api-ai'], bare))
    expect(lines[1]).toBe(
      `Its calls fail until a provider is bonded to it: npx mlcl add <provider> --inject, with one of ${providers.join(', ')}`,
    )
    const withOne = plain(
      afterAddGuidance('@molecule/api-ai', ['@molecule/api-ai-anthropic'], bare),
    )
    expect(withOne.join('\n')).not.toContain('provider is bonded')
  })

  it('adds the filesystem provider with the uploads core, which works with no configuration', () => {
    expect(missingMoleculePeers(['@molecule/api-uploads'])).toContain(
      '@molecule/api-uploads-filesystem',
    )
    expect(
      missingMoleculePeers(['@molecule/api-uploads', '@molecule/api-uploads-s3']),
    ).not.toContain('@molecule/api-uploads-filesystem')
  })

  it('prints the Quick Start of the API the code calls (OLD MUSTFAIL)', () => {
    // The 2026-11-24 add evals: after the add, every agent read the core's doc for the calls to write.
    const code =
      "import { receiveUploads } from '@molecule/api-uploads'\n\nrouter.post('/files', receiveUploads({ field: 'file' }))"
    const registry = registryWith({ '@molecule/api-uploads': code })
    expect(plain(afterAddGuidance('@molecule/api-uploads-filesystem', [], registry))).toEqual([
      'Your code calls it through @molecule/api-uploads, as its Quick Start shows:',
      "    import { receiveUploads } from '@molecule/api-uploads'",
      '',
      "    router.post('/files', receiveUploads({ field: 'file' }))",
      'The rest of its API: npx mlcl docs @molecule/api-uploads',
    ])
    const own = plain(
      afterAddGuidance('@molecule/api-uploads', ['@molecule/api-uploads-filesystem'], registry),
    )
    expect(own[0]).toBe('Use it as its Quick Start shows:')
    expect(own.at(-1)).toBe('The rest of its API: npx mlcl docs @molecule/api-uploads')
  })

  it('counterexample: a Quick Start on the provider itself is not the one printed', () => {
    const registry = registryWith({ '@molecule/api-uploads-filesystem': 'setProvider(provider)' })
    const lines = plain(afterAddGuidance('@molecule/api-uploads-filesystem', [], registry))
    expect(lines).toEqual([
      'Your code calls it through @molecule/api-uploads. Read that API: npx mlcl docs @molecule/api-uploads',
    ])
  })
})

/** A built package with the declarations of a small uploads core. */
const DIST = `import type { Middleware } from './middleware.js';
/** Stored files of the request's field. */
export declare const getUploads: (req: unknown, field?: string) => UploadedFile[];
export declare const getProvider: () => UploadProvider;
export declare function setProvider(provider: UploadProvider): void;
export interface UploadedFile {
  id: string;
  filename: string;
  mimetype: string;
}
export interface UploadProvider {
  getFile?: GetFileHandler;
}
export type GetFileHandler = (id: string) => Promise<NodeJS.ReadableStream | null>;
export interface Unrelated {
  value: string;
}
`
const EXPORTS = [
  'getUploads',
  'getProvider',
  'setProvider',
  'UploadedFile',
  'UploadProvider',
  'GetFileHandler',
  'Unrelated',
]
const QUICK_START =
  "import { getProvider, getUploads } from '@molecule/api-uploads'\n\nconst [file] = getUploads(req, 'file')\nconst stream = await getProvider().getFile?.(file.id)"

/** Run with an installed copy of the uploads core under a project's node_modules. */
async function withInstalled(run: (project: string) => Promise<void> | void): Promise<void> {
  const project = await mkdtemp(join(tmpdir(), 'mlcl-add-declarations-'))
  try {
    const dir = join(project, 'node_modules', '@molecule', 'api-uploads')
    await mkdir(join(dir, 'dist'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{"name":"@molecule/api-uploads"}')
    await writeFile(join(dir, 'dist', 'index.d.ts'), DIST)
    await run(project)
  } finally {
    await rm(project, { recursive: true, force: true })
  }
}

// r18 add eval (2026-11-24): after the add, Claude still read the uploads doc in 3 of 5 runs, for
// what getUploads returns and what getFile resolves to; the Quick Start's code does not say.
describe('the declarations mlcl add prints after a Quick Start', () => {
  it("declares what the Quick Start imports, then the package's types those name", async () => {
    await withInstalled((project) => {
      const dir = installedPackageDir('@molecule/api-uploads', join(project, 'src'))!
      const texts = quickStartDeclarations(QUICK_START, '@molecule/api-uploads', EXPORTS, dir)
      expect(texts).toEqual([
        'const getProvider: () => UploadProvider;',
        'const getUploads: (req: unknown, field?: string) => UploadedFile[];',
        'interface UploadProvider {\n  getFile?: GetFileHandler;\n}',
        'interface UploadedFile {\n  id: string;\n  filename: string;\n  mimetype: string;\n}',
        'type GetFileHandler = (id: string) => Promise<NodeJS.ReadableStream | null>;',
      ])
    })
  })

  it('prints them in place of the pointer to the rest of the doc (OLD MUSTFAIL)', async () => {
    await withInstalled((project) => {
      const registry = registryWith({ '@molecule/api-uploads': QUICK_START })
      registry.packages['@molecule/api-uploads']!.exports = EXPORTS
      const declarations = addedDeclarations('@molecule/api-uploads-filesystem', project, registry)
      const lines = plain(
        afterAddGuidance('@molecule/api-uploads-filesystem', [], registry, declarations),
      )
      expect(lines).toContain('What those calls take and return:')
      expect(lines).toContain('      filename: string;')
      expect(lines.join('\n')).toContain('Promise<NodeJS.ReadableStream | null>')
      expect(lines.join('\n')).not.toContain('The rest of its API')
      expect(lines.join('\n')).not.toContain('Unrelated')
    })
  })

  it('counterexample: a package that is not installed keeps the pointer to its doc', () => {
    const registry = registryWith({ '@molecule/api-uploads': QUICK_START })
    const declarations = addedDeclarations('@molecule/api-uploads-filesystem', tmpdir(), registry)
    expect(declarations).toEqual([])
    const lines = plain(
      afterAddGuidance('@molecule/api-uploads-filesystem', [], registry, declarations),
    )
    expect(lines.at(-1)).toBe('The rest of its API: npx mlcl docs @molecule/api-uploads')
  })
})
