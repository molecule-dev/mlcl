// GENERATED FILE — DO NOT EDIT.
//
// Byte-for-byte copy of `mlcl/src/lib/package-doc-files.ts`, made standalone so this package keeps its own
// build and deploy closure. Regenerate after ANY edit to the owner:
//   node scripts/generate-mcp-package-docs.mjs
// Drift fails src/lib/__tests__/mcp-doc-owner-drift.test.ts.

import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import { dirname, resolve } from 'node:path'

import type { DocDeclaration } from './package-doc-search.js'

/** Bounded declaration reader, also serialized into the sandbox; keep it self-contained. */
export function readDocDeclarations(
  root: string,
  io: typeof fs,
): { declarations: DocDeclaration[]; note?: string } {
  const declarations: DocDeclaration[] = []
  let remaining = 524_288
  let visited = 0
  let cut = false
  function walk(relative: string, depth: number): void {
    if (depth > 12 || visited >= 1_024 || declarations.length >= 128 || remaining <= 0) {
      cut = true
      return
    }
    let entries
    try {
      entries = io.readdirSync(root + '/' + relative, { withFileTypes: true })
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') cut = true
      return
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (++visited > 1_024 || declarations.length >= 128 || remaining <= 0) {
        cut = true
        break
      }
      const path = relative + '/' + entry.name
      if (entry.isSymbolicLink()) {
        cut = true
        continue
      }
      if (entry.isDirectory()) {
        walk(path, depth + 1)
        continue
      }
      if (!entry.isFile() || !path.endsWith('.d.ts')) continue
      let fd: number | undefined
      try {
        fd = io.openSync(root + '/' + path, 'r')
        const actual = io.realpathSync('/proc/self/fd/' + fd)
        const before = io.fstatSync(fd)
        if (
          !actual.startsWith(root + '/') ||
          !before.isFile() ||
          before.size > Math.min(262_144, remaining)
        ) {
          cut = true
          continue
        }
        const bytes = Buffer.alloc(before.size + 1)
        let length = 0
        while (length < bytes.length) {
          const n = io.readSync(fd, bytes, length, bytes.length - length, null)
          if (!n) break
          length += n
        }
        const after = io.fstatSync(fd)
        if (
          length !== before.size ||
          after.size !== before.size ||
          after.mtimeMs !== before.mtimeMs
        ) {
          cut = true
          continue
        }
        declarations.push({
          path,
          text: new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)),
        })
        remaining -= length
      } catch (_error) {
        cut = true // A partial scan must never establish declaration absence.
      } finally {
        if (fd !== undefined) io.closeSync(fd)
      }
    }
  }
  walk('dist', 0)
  return {
    declarations,
    ...(cut
      ? {
          note: 'Declaration scan incomplete (file/byte/depth cap or unreadable/unsafe path); no-hit terms do not establish absence.',
        }
      : {}),
  }
}

/** Read declarations beside the exact README selected by the existing doc resolver. */
export function declarationsBesideReadme(
  readmePath?: string,
): ReturnType<typeof readDocDeclarations> {
  if (!readmePath) return { declarations: [] }
  return readDocDeclarations(fs.realpathSync(dirname(readmePath)), fs)
}

/** Local MCP resolution follows hoisted node_modules and never selects a different copy's types. */
export function localPackageDoc(
  name: string,
  base: string,
): {
  readme: string
  declarations: DocDeclaration[]
  note?: string
} | null {
  let dir = resolve(base)
  for (;;) {
    const root = resolve(dir, 'node_modules', '@molecule', name)
    for (const readme of ['README.md', 'dist/README.md']) {
      try {
        const realRoot = fs.realpathSync(root)
        const path = fs.realpathSync(resolve(realRoot, readme))
        if (!path.startsWith(realRoot + '/')) continue
        const stat = fs.statSync(path)
        if (!stat.isFile() || stat.size > 1_048_576) continue
        return { readme: fs.readFileSync(path, 'utf8'), ...readDocDeclarations(realRoot, fs) }
      } catch (_error) {
        // No installed doc at this node_modules level; continue the normal upward lookup.
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/** The public npm registry, used when npm names no other. */
const PUBLIC_NPM_REGISTRY = 'https://registry.npmjs.org/'

/** npm's answer per directory, kept for the life of the process (the MCP server asks on every doc read). */
const configuredRegistries = new Map<string, string | undefined>()

/**
 * The registry npm itself installs `@molecule/*` packages from in `dir`: its `@molecule:registry`
 * scope when set, else its `registry`, from every config npm reads (the environment, the project's
 * and the user's .npmrc, the global config). Asked of npm, which takes about 0.1 s, once per
 * directory.
 *
 * The environment alone is not enough: npm sets `npm_config_registry` only for a process it starts,
 * and the MCP server runs as `node ~/.mlcl/mcp/run.mjs`. With the environment alone it read every
 * uninstalled package's doc from the public registry, which a mirror-only network cannot reach
 * (harness eval add, 2026-11-25: "npm did not return one", then a second read after the install).
 *
 * @param dir - The directory npm resolves its project config from.
 * @returns The URL, or undefined when npm cannot be run there or names none.
 */
export function npmConfiguredRegistry(dir: string): string | undefined {
  if (configuredRegistries.has(dir)) return configuredRegistries.get(dir)
  let found: string | undefined
  try {
    const out = execFileSync(
      'npm',
      ['config', 'get', '@molecule:registry', 'registry', '--no-workspaces'],
      { cwd: dir, encoding: 'utf8', timeout: 10_000, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const values = new Map(
      out
        .split('\n')
        .map((line) => [
          line.slice(0, line.indexOf('=')),
          line.slice(line.indexOf('=') + 1).trim(),
        ]),
    )
    found = [values.get('@molecule:registry'), values.get('registry')].find(
      (value) => value !== undefined && /^https?:\/\//i.test(value),
    )
  } catch (_error) {
    // npm is missing or fails in this directory: the caller reads the public registry, as it does
    // where npm names no other.
    found = undefined
  }
  configuredRegistries.set(dir, found)
  return found
}

/**
 * The npm registry a package that is not installed is read from: the one npm uses in `dir`
 * ({@link npmConfiguredRegistry}), else the one npm passed this process (`npm_config_registry`,
 * under npm or npx), so a company mirror or a local registry serves the doc; otherwise the public
 * registry. The hosted server passes no directory.
 *
 * @param env - The process environment.
 * @param dir - The directory being read from, when npm's own config applies there.
 * @returns The registry URL, ending in `/`.
 */
export function npmRegistryUrl(env: NodeJS.ProcessEnv = process.env, dir?: string): string {
  const configured =
    (dir ? npmConfiguredRegistry(dir) : undefined) ?? env.npm_config_registry?.trim()
  const url = configured && /^https?:\/\//i.test(configured) ? configured : PUBLIC_NPM_REGISTRY
  return url.endsWith('/') ? url : `${url}/`
}

/** The largest README read, installed or published (the same bound as {@link localPackageDoc}). */
const README_MAX_BYTES = 1_048_576
/** The largest package tarball fetched for its README. */
const TARBALL_MAX_BYTES = 32 * 1_048_576

/**
 * A published package's README and the version it came from, as the package ships it.
 *
 * The registry's packument carries a `readme` field, but npm cuts it at 65,536 characters:
 * `@molecule/app-react`'s README is 123 kB, so `useLogin`, `Form` and every other section past
 * that point were missing, and a harness asking for them read the package's dist files instead
 * (scaffold eval, 2026-11-23). This reads `README.md` from the `latest` version's tarball, after
 * checking the tarball against the manifest's sha512 `integrity`. The tarball must come from the
 * registry's own origin; for one served from elsewhere, or a manifest without a tarball, it falls
 * back to the packument's `readme`.
 *
 * Reading one named entry of a gzipped tar needs only its 512-byte headers, so this takes no tar
 * dependency into mlcl or molecule-mcp, and nothing is written to disk.
 *
 * @param name - The package name without its scope.
 * @param options - The registry, a timeout and the fetch to use.
 * @param options.registry - The registry URL ending in `/` (default {@link npmRegistryUrl}).
 * @param options.timeoutMs - Abort bound for each request.
 * @param options.fetchImpl - The fetch to use (tests).
 * @returns The README and its version, or null when the registry has no such package or README.
 * @throws {Error} When the registry answers with an error, or the tarball fails its integrity check.
 */
export async function fetchPublishedReadme(
  name: string,
  {
    registry = npmRegistryUrl(),
    timeoutMs = 15_000,
    fetchImpl = fetch,
  }: { registry?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<{ readme: string; version?: string } | null> {
  const get = async (url: string, accept?: string): Promise<Response | null> => {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      ...(accept ? { headers: { accept } } : {}),
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`)
    return response
  }
  const base = `${registry}@molecule%2F${name}`
  const manifest = (await (await get(`${base}/latest`, 'application/json'))?.json()) as
    { version?: unknown; dist?: { tarball?: unknown; integrity?: unknown } } | undefined
  const version = typeof manifest?.version === 'string' ? manifest.version : undefined
  const tarball = manifest?.dist?.tarball
  const integrity = manifest?.dist?.integrity
  if (
    typeof tarball === 'string' &&
    typeof integrity === 'string' &&
    integrity.startsWith('sha512-') &&
    URL.canParse(tarball) &&
    new URL(tarball).origin === new URL(registry).origin
  ) {
    const response = await get(tarball)
    if (!response) return null
    const length = Number(response.headers.get('content-length') ?? 0)
    if (length > TARBALL_MAX_BYTES)
      throw new Error(`${tarball} is larger than ${TARBALL_MAX_BYTES} bytes`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > TARBALL_MAX_BYTES)
      throw new Error(`${tarball} is larger than ${TARBALL_MAX_BYTES} bytes`)
    const { createHash } = await import('node:crypto')
    if (`sha512-${createHash('sha512').update(bytes).digest('base64')}` !== integrity)
      throw new Error(`${tarball} does not match its integrity ${integrity.slice(0, 20)}…`)
    const { gunzipSync } = await import('node:zlib')
    const readme = tarEntry(
      gunzipSync(bytes, { maxOutputLength: 8 * TARBALL_MAX_BYTES }),
      'README.md',
    )
    return readme?.trim() ? { readme, ...(version ? { version } : {}) } : null
  }
  const packument = (await (await get(base, 'application/json'))?.json()) as
    { readme?: unknown; 'dist-tags'?: { latest?: unknown } } | undefined
  const readme = typeof packument?.readme === 'string' ? packument.readme : ''
  if (!readme.trim() || readme.startsWith('ERROR: No README data found')) return null
  const latest = packument?.['dist-tags']?.latest
  return { readme, ...(typeof latest === 'string' ? { version: latest } : {}) }
}

/**
 * The text of a package tarball's top-level file (`package/<file>`), from its uncompressed tar.
 *
 * @param tar - The uncompressed tar.
 * @param file - The file name under the package directory.
 * @returns The file's text, or undefined when the tar has no such file or it is too large.
 */
function tarEntry(tar: Buffer, file: string): string | undefined {
  const field = (start: number, end: number): string => {
    const raw = tar.subarray(start, end)
    const nul = raw.indexOf(0)
    return raw.subarray(0, nul < 0 ? raw.length : nul).toString('utf8')
  }
  for (let at = 0; at + 512 <= tar.length;) {
    const name = field(at, at + 100)
    if (!name) return undefined
    const prefix = field(at + 345, at + 500)
    const size = parseInt(field(at + 124, at + 136).trim() || '0', 8)
    const type = field(at + 156, at + 157)
    const path = prefix ? `${prefix}/${name}` : name
    // npm packs every file under one top directory (`package/`).
    if ((type === '' || type === '0') && /^[^/]+\/[^/]+$/.test(path) && path.split('/')[1] === file)
      return size > README_MAX_BYTES
        ? undefined
        : tar.subarray(at + 512, at + 512 + size).toString('utf8')
    at += 512 + Math.ceil(size / 512) * 512
  }
  return undefined
}
