import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import * as docFiles from '../../../mcp/src/package-doc-files.js'
import { localPackageDoc, readDocDeclarations } from '../../../mcp/src/package-doc-files.js'
import {
  DOC_SEARCH_TOTAL_CHARS,
  parseDocSearch,
  searchPackageDoc,
} from '../../../mcp/src/package-doc-search.js'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Private installed-package fixture, never a write to a workspace installation. */
function project(): string {
  const root = fs.mkdtempSync(join(tmpdir(), 'doc-search-'))
  roots.push(root)
  return root
}

/** Install only the declared fixture files, leaving implementation JS out of the reference. */
function install(root: string, name: string, files: Record<string, string>): string {
  const dir = join(root, 'node_modules/@molecule', name)
  for (const [path, text] of Object.entries({ 'package.json': '{"version":"1.2.3"}', ...files })) {
    fs.mkdirSync(dirname(join(dir, path)), { recursive: true })
    fs.writeFileSync(join(dir, path), text)
  }
  return dir
}

const README =
  '# Example\n\n## Authentication\nBefore\nUse Bearer with Token.\nAfter\n\n## Options\ncurrentUserEndpoint is /me.\n'
const TYPES =
  'export interface AuthOptions {\n  currentUserEndpoint?: string;\n  mapCurrentUser?: (raw: unknown) => User;\n}\n\nexport declare class HttpError extends Error {\n  status: number;\n}\n'

describe('package doc literal search', () => {
  it('returns README hits, one context line and the containing heading', () => {
    const result = searchPackageDoc(README, ['bearer'])
    expect(result.doc).toContain('README.md:5 — section "Authentication"')
    expect(result.doc).toContain('4: Before\n5: Use Bearer with Token.\n6: After')
    expect(result.doc).not.toContain('currentUserEndpoint')
  })

  it('ignores heading syntax inside code fences', () => {
    const result = searchPackageDoc('## Usage\n```sh\n# fake\nToken\n```', ['token'])
    expect(result.doc).toContain('section "Usage"')
    expect(result.doc).not.toContain('section "fake"')
  })

  it('keeps multiline declarations whole and supplies path and line', () => {
    const result = searchPackageDoc(
      '',
      ['mapCurrentUser'],
      [{ path: 'dist/nested/client.d.ts', text: TYPES }],
    )
    expect(result.doc).toContain(
      'dist/nested/client.d.ts:1\nexport interface AuthOptions {\n  currentUserEndpoint?: string;\n  mapCurrentUser?: (raw: unknown) => User;\n}',
    )
    expect(result.doc).not.toContain('class HttpError')
  })

  it('returns the declaration owned by a matching JSDoc comment', () => {
    const result = searchPackageDoc(
      '',
      ['Bearer'],
      [
        {
          path: 'dist/auth.d.ts',
          text: 'export declare const unrelated: number;\n/** Bearer authorization. */\nexport declare function authenticate(): void;',
        },
      ],
    )
    expect(result.doc).toContain('function authenticate(): void;')
    expect(result.doc).not.toContain('const unrelated')
  })

  it('treats regex characters as literal text', () => {
    const result = searchPackageDoc('## Options\nA [x].* value\nA xxx value', ['[x].*'])
    expect(result.doc).toContain('A [x].* value')
    expect(searchPackageDoc('A xxx value', ['[x].*']).doc).toContain('No matches')
  })

  it('reports no hit for each absent term and packages without declarations', () => {
    const result = searchPackageDoc(README, ['absent', 'another'])
    expect(result.doc.match(/No matches/g)).toHaveLength(2)
    expect(result.note).toContain('No installed dist/**/*.d.ts')
  })

  it('caps README matches per term without starving declaration matches', () => {
    const result = searchPackageDoc(
      ('Token ' + 'x'.repeat(300) + '\n').repeat(150),
      ['Token'],
      [{ path: 'dist/types.d.ts', text: 'export type Token = string;' }],
    )
    expect(result.doc).toContain('README matches truncated')
    expect(result.doc).toContain('export type Token = string;')
    expect(result.truncated).toBe(true)
    expect(result.doc.length).toBeLessThan(6_000)
  })

  it('caps huge declarations while retaining a match deep in the interface', () => {
    const text =
      'export interface Large {\n' + '  field: string;\n'.repeat(250) + '  needle: number;\n}'
    const result = searchPackageDoc('', ['needle'], [{ path: 'dist/types.d.ts', text }])
    expect(result.doc).toContain('needle: number')
    expect(result.doc).toContain('declaration truncated')
    expect(result.truncated).toBe(true)
  })

  it('retains a literal hit late in a single huge README or declaration line', () => {
    const line = 'x'.repeat(3_000) + 'needle' + 'y'.repeat(3_000)
    const result = searchPackageDoc(
      '## Usage\n' + line,
      ['needle'],
      [{ path: 'dist/types.d.ts', text: `export type Huge = '${line}';` }],
    )
    expect(result.doc.match(/needle/g)?.length).toBeGreaterThanOrEqual(3)
    expect(result.doc).toContain('README.md:2')
    expect(result.doc).toContain('dist/types.d.ts:1')
    expect(result.doc).toContain('line truncated')
  })

  it('caps total output and names omitted terms', () => {
    const terms = ['one', 'two', 'three', 'four', 'five', 'six']
    const readme = (terms.join(' ') + ' x'.repeat(130) + '\n').repeat(90)
    const declarations = Array.from({ length: 20 }, (_, i) => ({
      path: `dist/${i}.d.ts`,
      text: `export type Thing${i} = '${terms.join(' ')} ${'x'.repeat(700)}';`,
    }))
    const result = searchPackageDoc(readme, terms, declarations)
    expect(result.doc.length).toBeLessThanOrEqual(DOC_SEARCH_TOTAL_CHARS)
    expect(result.doc).toContain('total search cap reached')
    for (const term of terms) expect(result.doc).toContain(`Search: "${term}"`)
  })

  it.each([[], ['x', 'x', 'x', 'x', 'x', 'x', 'x'], '', ' ', ['ok', 4], 'a'.repeat(201)])(
    'rejects invalid search input %j',
    (input) => {
      expect(() => parseDocSearch(input)).toThrow('`search` must be')
    },
  )

  it('accepts a scalar and up to six terms', () => {
    expect(parseDocSearch('Token')).toEqual(['Token'])
    expect(parseDocSearch(['a', 'b', 'c', 'd', 'e', 'f'])).toHaveLength(6)
  })
})

describe('installed declaration reader', () => {
  it('walks nested declaration files but never searches implementation JS', () => {
    const root = project()
    const dir = install(root, 'api-storage-example', {
      'README.md': '# Storage',
      'dist/nested/types.d.ts': 'export interface Upload { bucket: string }',
      'dist/client.js': 'const implementationOnly = true;',
    })
    const scan = readDocDeclarations(fs.realpathSync(dir), fs)
    expect(scan.declarations.map((file) => file.path)).toEqual(['dist/nested/types.d.ts'])
    expect(searchPackageDoc('# Storage', ['implementationOnly'], scan.declarations).doc).toContain(
      'No matches',
    )
    expect(localPackageDoc('api-storage-example', join(root, 'api'))?.readme).toBe('# Storage')
  })

  it('works for a package without dist declarations', () => {
    const dir = install(project(), 'api-storage-example', { 'README.md': '# Storage\nBucket' })
    expect(readDocDeclarations(fs.realpathSync(dir), fs)).toEqual({ declarations: [] })
  })

  it('refuses symlink escapes and reports an incomplete declaration scan', () => {
    const root = project()
    const dir = install(root, 'api-storage-example', {
      'README.md': '# Storage',
      'dist/inside.d.ts': 'export type Inside = number;',
    })
    fs.writeFileSync(join(root, 'outside.d.ts'), 'export type Secret = string;')
    fs.symlinkSync(join(root, 'outside.d.ts'), join(dir, 'dist/outside.d.ts'))
    const result = readDocDeclarations(fs.realpathSync(dir), fs)
    expect(result.declarations.map((file) => file.path)).toEqual(['dist/inside.d.ts'])
    expect(result.note).toContain('scan incomplete')
  })

  it('reports declaration file byte caps rather than claiming absence', () => {
    const dir = install(project(), 'api-storage-example', {
      'README.md': '# Storage',
      'dist/huge.d.ts': 'x'.repeat(262_145),
    })
    expect(readDocDeclarations(fs.realpathSync(dir), fs).note).toContain('scan incomplete')
  })
})

/** Real workspace or standalone installed README; fail rather than skip missing fixtures. */
function realReadme(name: string): string {
  let root = process.cwd()
  for (;;) {
    const path = join(root, 'node_modules/@molecule', name, 'README.md')
    if (fs.existsSync(path)) return fs.readFileSync(path, 'utf8')
    const parent = dirname(root)
    if (parent === root) throw new Error(`Missing installed fixture: ${name}`)
    root = parent
  }
}

describe('real package reference questions', () => {
  it('answers api-resource-user Bearer and Token questions from README lines', () => {
    const result = searchPackageDoc(realReadme('api-resource-user'), ['Bearer', 'Token'])
    expect(result.doc).toMatch(/\d+: .*Bearer/i)
    expect(result.doc).toMatch(/\d+: .*Token/i)
    expect(result.doc).toContain('section ')
  })

  it('answers app-auth currentUserEndpoint from README lines', () => {
    const result = searchPackageDoc(realReadme('app-auth'), ['currentUserEndpoint'])
    expect(result.doc).toMatch(/\d+: .*currentUserEndpoint/)
    expect(result.doc).toContain('section ')
  })

  it('works for the payments Stripe bond outside the measured workload', () => {
    const result = searchPackageDoc(realReadme('api-payments-stripe'), ['webhook'])
    expect(result.doc).toMatch(/\d+: .*webhook/i)
    expect(result.doc).not.toContain('No matches')
  })
})

describe('read_package_doc MCP search consumers', () => {
  type Result = { content?: Array<{ text?: string }>; isError?: boolean }
  let call: (args: Record<string, unknown>) => Promise<Result>
  let remoteCall: typeof call
  const closers: Array<() => Promise<void>> = []
  const originalDnt = process.env.DO_NOT_TRACK

  beforeEach(() => {
    // A baseline without search must never turn these local tests into a network request.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ readme: README }), { status: 200 })),
    )
  })

  beforeAll(async () => {
    process.env.DO_NOT_TRACK = '1'
    const { moleculeServer } = await import('../../../mcp/src/server.js')
    const { buildRemoteServer } = await import('../../../mcp/src/remote.js')
    const sdk = resolve(
      import.meta.dirname,
      '../../../mcp/node_modules/@modelcontextprotocol/sdk/dist/esm',
    )
    const { Client } = await import(join(sdk, 'client/index.js'))
    const { InMemoryTransport } = await import(join(sdk, 'inMemory.js'))
    for (const server of [moleculeServer, buildRemoteServer()]) {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
      await server.connect(serverTransport)
      const client = new Client({ name: 'package-doc-search', version: '0.0.0' })
      await client.connect(clientTransport)
      const invoke = (args: Record<string, unknown>): Promise<Result> =>
        client.callTool({ name: 'read_package_doc', arguments: args })
      if (!call) call = invoke
      else remoteCall = invoke
      closers.push(() => client.close())
    }
  })

  afterAll(async () => {
    for (const close of closers) await close()
    if (originalDnt === undefined) delete process.env.DO_NOT_TRACK
    else process.env.DO_NOT_TRACK = originalDnt
  })

  /** MCP text blocks, exactly what the client receives. */
  function text(result: Result): string {
    return result.content?.map((part) => part.text ?? '').join('\n') ?? ''
  }

  it('reads installed README and nested declarations through the real stdio tool', async () => {
    const root = project()
    install(root, 'api-storage-example', {
      'README.md': README,
      'dist/nested/types.d.ts': TYPES,
      'dist/client.js': 'const implementationOnly = true;',
    })
    const result = text(
      await call({
        name: 'api-storage-example',
        directory: root,
        search: ['Token', 'mapCurrentUser', 'implementationOnly'],
      }),
    )
    expect(result).toContain('README.md:5')
    expect(result).toContain('dist/nested/types.d.ts:1')
    expect(result).toContain('mapCurrentUser?:')
    expect(result).toContain('No matches')
  })

  it('accepts scalar literal search over MCP', async () => {
    const root = project()
    install(root, 'api-storage-example', { 'README.md': '## Options\nUse [x].* literally.' })
    expect(
      text(await call({ name: 'api-storage-example', directory: root, search: '[x].*' })),
    ).toContain('README.md:2')
  })

  it('searches the same local README and declaration copy in hosted mode when installed', async () => {
    const root = project()
    install(root, 'api-storage-example', { 'README.md': README, 'dist/types.d.ts': TYPES })
    const read = docFiles.localPackageDoc
    vi.spyOn(docFiles, 'localPackageDoc').mockImplementation((name) => read(name, root))
    const result = text(await remoteCall({ name: 'api-storage-example', search: 'mapCurrentUser' }))
    expect(result).toContain('dist/types.d.ts:1')
    expect(result).toContain('mapCurrentUser?:')
  })

  it('searches the existing hosted published README source and states missing type availability', async () => {
    vi.spyOn(docFiles, 'localPackageDoc').mockReturnValue(null)
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ readme: README }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    try {
      const result = text(
        await remoteCall({ name: 'api-doc-search-uninstalled-fixture', search: 'Bearer' }),
      )
      expect(result).toContain('README.md:5')
      expect(result).toContain('declaration files are unavailable on this host')
      expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('rejects invalid and excessive terms in both MCP schemas', async () => {
    for (const invoke of [call, remoteCall]) {
      for (const search of [[], ['a', 'b', 'c', 'd', 'e', 'f', 'g'], '', ' ', 'x'.repeat(201)]) {
        const result = await invoke({ name: 'api-doc-search-invalid', search })
        expect(result.isError).toBe(true)
      }
    }
  })
})
