/**
 * `scanDeclarations` — the package declarations a generated bond file shows.
 *
 * A published package ships only `dist/`, so a production scaffold has no source a weak model
 * could read the client's real signatures from; the bond file is where it looks. These cases pin
 * what a shown declaration keeps (the signature a caller needs) and drops (comments, bodies,
 * initializers, private members), that every shown text is a valid declaration, and how the
 * registry scope and the bond header are built from it.
 *
 * @module
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as ts from 'typescript'
import { afterAll, describe, expect, it } from 'vitest'

import {
  bondDeclarations,
  type BondDeclarationSource,
  type CapabilityMapEntry,
  renderBondDeclarations,
  renderCapabilityBondHeader,
} from '../capability-map.js'
import { getRawRegistry } from '../registry.js'
import { declarationScope, scanDeclarations } from '../scanner.js'

const tempDirs: string[] = []

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
})

/** Write a package `src/` from `files` and return its path. */
async function fixtureSource(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'scan-declarations-'))
  tempDirs.push(dir)
  const src = join(dir, 'src')
  await mkdir(src, { recursive: true })
  for (const [name, text] of Object.entries(files)) await writeFile(join(src, name), text)
  return src
}

const FIXTURE = {
  'index.ts': `/** module doc */
export * from './types.js'
export { reexported } from './other.js'

/**
 * Create a client.
 * @param config - the config
 */
export function createClient(config?: ClientConfig): Client
export function createClient(config: ClientConfig, extra: number): Client
export function createClient(config?: ClientConfig, extra?: number): Client {
  // body comment
  return { config, extra } as unknown as Client
}

/** Arrow factory. */
export const createArrow = <T extends object>(options: T = {} as T): Wrapped<T> => {
  return { options } as Wrapped<T>
}

export function withDefaults(a = 1, b: string, c = 'x', ...rest: number[]): void {
  void [a, b, c, rest]
}

export const typedConst: Readonly<Record<string, number>> = { a: 1 }
export const untyped = { b: 2 }
const notExported = 1

export class Store<T> {
  /** public field */
  readonly size: number = 0
  static readonly key = 'k'
  private secret = 1
  protected guarded(): void {}
  #hidden = 2
  constructor(private readonly seed: T, public label = 'store') {
    this.size = notExported
  }
  get value(): T {
    return this.seed
  }
  async load(id: string): Promise<T> {
    return this.seed
  }
}
`,
  'types.ts': `/** The config. */
export interface ClientConfig {
  /** base url */
  baseURL?: string
  headers?: Record<string, string> // trailing
}

export type Client = { get(path: string): Promise<unknown> }
export type Wrapped<T> = { options: T }
export enum Mode {
  A = 'a',
  B = 'b',
}
export type Weird = '*/'
`,
  // A test file never contributes a declaration.
  'index.test.ts': 'export interface ClientConfig { fromTest: true }\n',
}

const EXPECTED: Record<string, string> = {
  ClientConfig:
    'interface ClientConfig {\n  baseURL?: string;\n  headers?: Record<string, string>;\n}',
  Client: 'type Client = {\n  get(path: string): Promise<unknown>;\n};',
  Wrapped: 'type Wrapped<T> = {\n  options: T;\n};',
  Mode: "enum Mode {\n  A = 'a',\n  B = 'b'\n}",
  createClient:
    'function createClient(config?: ClientConfig): Client;\n' +
    'function createClient(config: ClientConfig, extra: number): Client;',
  createArrow: 'function createArrow<T extends object>(options?: T): Wrapped<T>;',
  withDefaults:
    'function withDefaults(a: number | undefined, b: string, c?: string, ...rest: number[]): void;',
  typedConst: 'const typedConst: Readonly<Record<string, number>>;',
  Store:
    'class Store<T> {\n' +
    '  label: string;\n' +
    '  readonly size: number;\n' +
    '  constructor(seed: T, label?: string);\n' +
    '  get value(): T;\n' +
    '  load(id: string): Promise<T>;\n' +
    '}',
  Weird: "type Weird = '*/';",
}

/**
 * Errors of `text` read as ambient declarations (inside a `declare namespace`, where a shown
 * declaration needs no `declare` keyword); unresolved names are not its concern.
 */
function declarationErrors(text: string): string[] {
  const fileName = '/declarations.d.ts'
  const host = ts.createCompilerHost({ noLib: true, noResolve: true, types: [] })
  const original = host.getSourceFile
  host.getSourceFile = (name, version) =>
    name === fileName
      ? ts.createSourceFile(name, `declare namespace Shown {\n${text}\n}\n`, version, true)
      : original(name, version)
  const program = ts.createProgram([fileName], { noLib: true, noResolve: true, types: [] }, host)
  const file = program.getSourceFile(fileName)!
  // 2304/2552 a name from elsewhere, 2318/2583 a global type absent without lib, 2315 a generic
  // read as non-generic because its declaration is absent.
  const unresolved = new Set([2304, 2552, 2318, 2583, 2315])
  return [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)]
    .filter((d) => !unresolved.has(d.code))
    .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
}

describe('scanDeclarations', () => {
  it('shows each export as the declaration a caller needs', async () => {
    const src = await fixtureSource(FIXTURE)
    const names = [...Object.keys(EXPECTED), 'untyped', 'reexported', 'notExported', 'missing']
    const result = await scanDeclarations(src, names)
    expect(result).toEqual(EXPECTED)
    // In the order asked, not the order found.
    expect(Object.keys(result)).toEqual(Object.keys(EXPECTED))
  })

  it('answers nothing for no names', async () => {
    expect(await scanDeclarations(await fixtureSource(FIXTURE), [])).toEqual({})
  })

  it('shows only valid declarations for the fixture', () => {
    for (const [name, text] of Object.entries(EXPECTED))
      expect(declarationErrors(text), name).toEqual([])
  })

  it('catches an invalid declaration (the checker is not inert)', () => {
    expect(declarationErrors('function f(a = 1): void;')).not.toEqual([])
    expect(declarationErrors('class C {\n  async load(): Promise<void>;\n}')).not.toEqual([])
  })

  it('records only valid declarations in the registry', () => {
    const packages = getRawRegistry().packages
    const recorded = Object.entries(packages).flatMap(([name, entry]) =>
      Object.entries(entry.declarations ?? {}).map(([n, text]) => [`${name} ${n}`, text] as const),
    )
    // app-auth's own names plus every web binding's useAuth and result type.
    expect(recorded.length).toBeGreaterThanOrEqual(17)
    for (const [label, text] of recorded) expect(declarationErrors(text), label).toEqual([])
  })
})

describe('declarationScope', () => {
  it("merges a package's own declare list with the names other entries ask of it", () => {
    const scope = declarationScope({
      '@molecule/app-auth': {
        defaultBondSetup: { declare: ['createJWTAuthClient', 'AuthClient'] },
        decisionGuide: {
          bindingDeclare: {
            '@molecule/app-react': ['useAuth', 'UseAuthResult'],
            '@molecule/app-vue': ['useAuth', 'UseAuthReturn'],
          },
        },
      },
      '@molecule/app-feature': {
        decisionGuide: { bindingDeclare: { '@molecule/app-react': ['useAuth', 'useFeature'] } },
      },
      '@molecule/app-quiet': { defaultBondSetup: { declare: [] } },
    })
    expect(Object.fromEntries(scope)).toEqual({
      '@molecule/app-auth': ['AuthClient', 'createJWTAuthClient'],
      '@molecule/app-react': ['UseAuthResult', 'useAuth', 'useFeature'],
      '@molecule/app-vue': ['UseAuthReturn', 'useAuth'],
    })
  })
})

describe('bond header declarations', () => {
  const auth = {
    defaultBondSetup: { declare: ['createJWTAuthClient', 'AuthClient', 'Unscanned'] },
    decisionGuide: { bindingDeclare: { '@molecule/app-react': ['useAuth'] } },
    declarations: {
      createJWTAuthClient: 'function createJWTAuthClient(config?: Options): AuthClient;',
      AuthClient: 'interface AuthClient {\n  getUser(): User | null;\n}',
    },
  } satisfies BondDeclarationSource
  const packages = {
    '@molecule/app-react': {
      declarations: { useAuth: 'function useAuth(): UseAuthResult;' },
    },
  }

  it("lists the package's own declarations, then each declared binding's, skipping unscanned", () => {
    expect(bondDeclarations(auth, ['@molecule/app-react'], packages)).toEqual([
      'function createJWTAuthClient(config?: Options): AuthClient;',
      'interface AuthClient {\n  getUser(): User | null;\n}',
      'function useAuth(): UseAuthResult;',
    ])
    expect(bondDeclarations(auth, ['@molecule/app-vue'], packages)).toHaveLength(2)
    expect(bondDeclarations(auth, ['@molecule/app-react'], undefined)).toHaveLength(2)
  })

  it('renders indented lines that cannot end the doc comment', () => {
    expect(renderBondDeclarations([])).toEqual([])
    expect(
      renderBondDeclarations(["type Weird = '*/';", 'interface A {\n  b: string;\n}']),
    ).toEqual([
      'Declarations (generated from the package types; the README has the docs):',
      "  type Weird = '* /';",
      '  interface A {',
      '    b: string;',
      '  }',
    ])
  })

  it('puts the declarations in the bond header before the documentation line', () => {
    const entry: CapabilityMapEntry = {
      name: '@molecule/app-probe',
      label: 'Probe',
      description: 'A probe capability.',
      capabilities: [],
      workspaces: [''],
      guidance: ['Use the bonded client.'],
      configuration: ['- A: `x`'],
      configNames: [],
      documentation: 'https://www.molecule.dev/packages/app-probe',
      declarations: ["type Weird = '*/';"],
    }
    const header = renderCapabilityBondHeader(entry)
    expect(header).toContain(" *   type Weird = '* /';")
    expect(header.indexOf('Declarations (generated')).toBeLessThan(
      header.indexOf('Read the package documentation'),
    )
    // The header is one doc comment: the only `*/` is its end.
    expect(header.indexOf('*/')).toBe(header.trimEnd().length - 2)
  })
})
