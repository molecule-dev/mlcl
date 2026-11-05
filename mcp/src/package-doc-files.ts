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
