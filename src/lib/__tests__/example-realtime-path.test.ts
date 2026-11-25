/**
 * An example slice's SSE client must open the path its SSE bond serves.
 *
 * The SSE provider streams ONE path (`createProvider({ path })`, `/sse` when the
 * option is left out) and reads rooms from `?room=`. A client `EventSource` on any
 * other path gets the API's 404 or the SPA, and the page never receives a frame:
 * the in-app notifications bond created its provider without a `path` while its
 * bell opened `/api/realtime?room=user:<id>`, so live notifications never arrived.
 *
 * @module
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const EXAMPLES = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../templates/.agents/skills/examples',
)

/** The path `@molecule/api-realtime-sse` serves when `createProvider` gets none. */
const SSE_DEFAULT_PATH = '/sse'

/** Every file under `dir` whose name ends in one of `extensions`. */
function filesUnder(dir: string, extensions: string[]): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry)
    if (statSync(file).isDirectory()) out.push(...filesUnder(file, extensions))
    else if (extensions.some((extension) => entry.endsWith(extension))) out.push(file)
  }
  return out
}

/** `source` without block and line comments (a call written in a comment is not a call). */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
}

/** The path each `createProvider(...)` call from the SSE bond serves. */
function ssePathsServed(source: string): string[] {
  if (!source.includes(`from '@molecule/api-realtime-sse'`)) return []
  return [...withoutComments(source).matchAll(/createProvider\(([^)]*)\)/g)].map(
    ([, options]) => /\bpath:\s*['"`]([^'"`]+)['"`]/.exec(options)?.[1] ?? SSE_DEFAULT_PATH,
  )
}

/** The path (before any query or interpolation) each `new EventSource(...)` opens. */
function eventSourcePaths(source: string): string[] {
  return [...withoutComments(source).matchAll(/new EventSource\(\s*['"`]([^'"`?$]*)/g)].map(
    ([, path]) => path,
  )
}

/** Slices whose api/ code bonds the SSE provider. */
function sseSlices(): { slice: string; served: string[]; clients: string[] }[] {
  const slices: { slice: string; served: string[]; clients: string[] }[] = []
  for (const category of readdirSync(EXAMPLES)) {
    const categoryDir = join(EXAMPLES, category)
    if (!statSync(categoryDir).isDirectory()) continue
    for (const name of readdirSync(categoryDir)) {
      const dir = join(categoryDir, name)
      if (!statSync(dir).isDirectory()) continue
      const read = (sub: string): string[] => {
        try {
          return filesUnder(join(dir, sub), ['.ts', '.tsx']).map((file) =>
            readFileSync(file, 'utf8'),
          )
        } catch (_error) {
          // The slice has no `${sub}/` half (an app-only or api-only slice).
          return []
        }
      }
      const served = read('api').flatMap(ssePathsServed)
      if (served.length === 0) continue
      slices.push({
        slice: relative(EXAMPLES, dir),
        served,
        clients: read('app').flatMap(eventSourcePaths),
      })
    }
  }
  return slices
}

describe('example SSE clients open the path their bond serves', () => {
  it('reads the served path, the default and the client path', () => {
    const bond = `import { createProvider } from '@molecule/api-realtime-sse'\n`
    expect(ssePathsServed(`${bond}createProvider({ deferAttach: true })`)).toEqual(['/sse'])
    expect(
      ssePathsServed(`${bond}createProvider({ deferAttach: true, path: '/api/realtime' })`),
    ).toEqual(['/api/realtime'])
    expect(ssePathsServed(`createProvider({ deferAttach: true })`)).toEqual([])
    expect(
      ssePathsServed(
        `${bond}/** \`createProvider({ deferAttach: true })\` waits. */\n// createProvider({})\n` +
          `createProvider({ deferAttach: true, path: '/api/realtime' }) // http://x`,
      ),
    ).toEqual(['/api/realtime'])
    expect(
      eventSourcePaths('new EventSource(\n  `/api/realtime?room=${encodeURIComponent(room)}`,\n)'),
    ).toEqual(['/api/realtime'])
  })

  const slices = sseSlices()

  it('finds the SSE slices', () => {
    expect(slices.map(({ slice }) => slice).sort()).toEqual([
      'messaging/in-app-chat',
      'notifications/in-app-notifications',
    ])
  })

  it.each(slices)('$slice', ({ served, clients }) => {
    expect(clients.length).toBeGreaterThan(0)
    for (const path of clients) expect(served).toContain(path)
  })
})
