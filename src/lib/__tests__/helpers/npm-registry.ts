/**
 * A stand-in npm registry for tests of the published-README reader (`fetchPublishedReadme`): it
 * answers a package's `/latest` manifest, the tarball the manifest names (a real gzipped tar
 * holding `package/README.md`, made with the system `tar` the way `npm pack` lays it out), and
 * the packument, whose `readme` npm cuts at 65,536 characters. Anything else is a 404.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** The public registry, as `npmRegistryUrl` returns it. */
export const PUBLIC_REGISTRY = 'https://registry.npmjs.org/'

/** npm's cut-off for a packument's `readme` field. */
export const PACKUMENT_README_LIMIT = 65_536

/**
 * A gzipped package tarball with one `package/<file>` entry per given file.
 *
 * @param files - File name under `package/` → contents.
 * @returns The `.tgz` bytes.
 */
export function packageTarball(files: Record<string, string>): Buffer {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-npm-tarball-'))
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(join(dir, 'package'), { recursive: true })
      writeFileSync(join(dir, 'package', file), text)
    }
    execFileSync('tar', ['-czf', join(dir, 'out.tgz'), '-C', dir, 'package'])
    return readFileSync(join(dir, 'out.tgz'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** The npm integrity string for some bytes. */
export const integrityOf = (bytes: Buffer): string =>
  `sha512-${createHash('sha512').update(bytes).digest('base64')}`

/** How the stand-in serves one README. */
export interface PublishedReadme {
  /** The README the tarball holds. */
  readme: string
  /** The `latest` version (default 1.0.0). */
  version?: string
  /** The tarball's origin, when it is not the registry's own. */
  tarballOrigin?: string
  /** An integrity that does not match the tarball. */
  badIntegrity?: boolean
}

/**
 * A fetch answering like the registry at `registry` for every `@molecule/<name>`.
 *
 * @param published - What every package serves; null for a registry that knows no package.
 * @param registry - The registry URL, ending in `/`.
 * @returns The fetch.
 */
export function registryFetch(
  published: PublishedReadme | null,
  registry: string = PUBLIC_REGISTRY,
): (input: string | URL | Request) => Promise<Response> {
  const tarball = published
    ? packageTarball({ 'README.md': published.readme, 'package.json': '{}' })
    : null
  const version = published?.version ?? '1.0.0'
  const json = (body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  return async (input) => {
    const url = String(input instanceof Request ? input.url : input)
    const notFound = new Response('{"error":"Not found"}', { status: 404 })
    if (!published || !tarball) return notFound
    const scoped = url.startsWith(`${registry}@molecule%2F`)
      ? url.slice(`${registry}@molecule%2F`.length)
      : ''
    const latest = scoped.match(/^([a-z0-9-]+)\/latest$/)
    if (latest) {
      const origin = published.tarballOrigin ?? registry.replace(/\/$/, '')
      return json({
        name: `@molecule/${latest[1]}`,
        version,
        dist: {
          tarball: `${origin}/@molecule/${latest[1]}/-/${latest[1]}-${version}.tgz`,
          integrity: published.badIntegrity
            ? integrityOf(Buffer.from('other'))
            : integrityOf(tarball),
        },
      })
    }
    if (/^[a-z0-9-]+$/.test(scoped))
      return json({
        'dist-tags': { latest: version },
        readme: published.readme.slice(0, PACKUMENT_README_LIMIT),
      })
    if (/\/@molecule\/[a-z0-9-]+\/-\/[a-z0-9.-]+\.tgz$/.test(url))
      return new Response(new Uint8Array(tarball), {
        status: 200,
        headers: { 'content-length': String(tarball.length) },
      })
    return notFound
  }
}

/**
 * How many README lookups a spied fetch served: one `/latest` request each.
 *
 * @param spy - The spied fetch.
 * @param spy.mock - Its recorded calls.
 * @param spy.mock.calls - The calls' arguments.
 * @returns The number of lookups.
 */
export const lookups = (spy: { mock: { calls: unknown[][] } }): number =>
  spy.mock.calls.filter((call) => String(call[0]).endsWith('/latest')).length
