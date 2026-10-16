// @vitest-environment node
/**
 * The session middleware (`authorization.verifyMiddleware()`) is mounted at the
 * `/api` root EXACTLY once per template, in `api/src/App/router.ts` — the one
 * file an app owns the auth policy in.
 *
 * Why this is a gate and not a style rule. `createServerFactory` runs
 * `preApiRouter(app)` BEFORE `app.use('/api', router)`, so a mount there runs
 * first for every `/api` request. Five templates mounted one there
 * (`app.use('/api', userAuthorization.verifyMiddleware())` next to their content
 * handlers) while `App/router.ts` mounted a second one — and the SECOND is the
 * one the app sets options on. `verifyMiddleware` reads the `token` cookie by
 * default, so the earlier mount resolved the session from a cookie and the later
 * `verifyMiddleware({ allowCookieSession: false })` never saw a headerless
 * request: an app that asked for a token-only API stayed cookie-authenticated,
 * and its HTTP tests' "no auth" steps answered 200. That cost a live run six
 * minutes (X1 flash-m70, `errors_auth.hurl`).
 *
 * The generator already agrees on the location: `generateRouterContentHeuristic`
 * emits the app-wide gate as `router.use(xAuthorization.verifyMiddleware())` in
 * the generated `App/router.ts` — so a template that ALSO mounts it in the
 * server bootstrap is the outlier, never the shape to copy.
 *
 * Scoped mounts are NOT duplicates and stay allowed: a route family that must be
 * authenticated before the body parser consumes its stream (uploads) mounts the
 * middleware on its own sub-path (`app.use('/api/uploads', verifyMiddleware(), …)`)
 * — it is the only mount for that path, and it runs before the router without
 * shadowing it.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const APPS = join(dirname(fileURLToPath(import.meta.url)), '../../../templates/apps')

/** Where a mount is written, and the path it is mounted on (`''` = pathless). */
export interface MountSite {
  /** Path of the source file, relative to the template directory. */
  file: string
  /** 1-indexed line the mount's `.use(` starts on. */
  line: number
  /** The mount's path argument, or `''` when it names none (`router.use(mw)`). */
  path: string
}

/** Longest gap a `.use(` may sit before `verifyMiddleware(` and still be its mount. */
const MOUNT_LOOKBEHIND = 300

/**
 * Mount sites of the session middleware in one source file.
 *
 * A site is a `verifyMiddleware(` call whose enclosing `.use(` is written within
 * {@link MOUNT_LOOKBEHIND} characters before it with no statement boundary
 * between — so a multi-line mount is one site attributed to its line, while a
 * bare `const mw = verifyMiddleware()` (no `.use(` before it) is not a mount.
 * Comment text is stripped per line, so the doc comments that NAME the mount
 * (`// … router.use(userAuthorization.verifyMiddleware()) …`) are not counted.
 */
export const mountSites = (file: string, source: string): MountSite[] => {
  // Comment-strip per line but keep offsets: a `//` inside a URL in a string is
  // not a comment, though no mount argument in the fleet carries one.
  const lines = source.split('\n')
  const code = lines.map((line) => line.split('//')[0] ?? '').join('\n')

  const sites: MountSite[] = []
  const call = /verifyMiddleware\s*\(/g
  let match: RegExpExecArray | null
  while ((match = call.exec(code)) !== null) {
    const before = code.slice(Math.max(0, match.index - MOUNT_LOOKBEHIND), match.index)
    const use = /\.use\s*\(/g
    let last: RegExpExecArray | null = null
    let next: RegExpExecArray | null
    while ((next = use.exec(before)) !== null) last = next
    if (!last) continue // a definition/reference, not a mount
    const between = before.slice(last.index)
    if (between.includes(';')) continue // a different statement than this `.use(`
    const path = /\.use\s*\(\s*(?:'([^']*)'|"([^"]*)")/.exec(between)
    const useAt = match.index - between.length
    sites.push({
      file,
      line: code.slice(0, useAt).split('\n').length,
      path: path?.[1] ?? path?.[2] ?? '',
    })
  }
  return sites
}

/** Sources of every non-test TypeScript file under `<template>/api/src`. */
const sourcesUnder = (
  templateRoot: string,
  dir = 'api/src',
): { file: string; source: string }[] => {
  const out: { file: string; source: string }[] = []
  for (const entry of readdirSync(join(templateRoot, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules' || entry.name === 'dist')
        continue
      out.push(...sourcesUnder(templateRoot, rel))
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push({ file: rel, source: readFileSync(join(templateRoot, rel), 'utf8') })
    }
  }
  return out
}

/** A `/api`-root mount: the shape that shadows `App/router.ts`'s own mount. */
const isRootMount = (site: MountSite): boolean => site.path === '' || site.path === '/api'

/**
 * Everything wrong with one template's session-middleware mounts. The single
 * root mount must live in `api/src/App/router.ts`, and a scoped mount must still
 * be under `/api` (the API's only public prefix).
 */
export const mountProblems = (sources: { file: string; source: string }[]): string[] => {
  const sites = sources.flatMap(({ file, source }) => mountSites(file, source))
  const problems: string[] = []

  for (const site of sites) {
    if (isRootMount(site) || site.path.startsWith('/api/')) continue
    problems.push(`mounts the session middleware at '${site.path}' (${site.file}:${site.line})`)
  }

  const roots = sites.filter(isRootMount)
  if (roots.length === 0) {
    problems.push('mounts the session middleware nowhere at the /api root')
  } else if (roots.length > 1) {
    problems.push(
      `mounts the session middleware at the /api root ${roots.length} times ` +
        `(${roots.map((s) => `${s.file}:${s.line}`).join(', ')}) — only the first mount's ` +
        'options are seen for the requests the others handle',
    )
  } else if (roots[0].file !== 'api/src/App/router.ts') {
    problems.push(
      `mounts the session middleware at the /api root in ${roots[0].file}:${roots[0].line}, ` +
        'not api/src/App/router.ts — an app that changes its auth policy there is shadowed ' +
        'by this earlier mount',
    )
  }

  return problems
}

const templateDirs = (): string[] =>
  readdirSync(APPS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .filter((name) => {
      try {
        readFileSync(join(APPS, name, 'api/src/App/router.ts'))
        return true
      } catch (_error) {
        // no `api/src/App/router.ts` (a static-site template) — nothing to mount
        return false
      }
    })

describe('the session middleware is mounted exactly once, in App/router.ts', () => {
  const templates = templateDirs()

  it('scans the fleet', () => {
    // A scan that finds no templates would pass every assertion below.
    expect(templates.length).toBeGreaterThan(100)
  })

  it.each(templates)('%s', (template) => {
    const sources = sourcesUnder(join(APPS, template))
    expect(sources.length).toBeGreaterThan(0)
    expect(mountProblems(sources)).toEqual([])
  })
})

describe('the gate fails on the shape it exists to catch', () => {
  it('flags the pre-fix pair: preApiRouter mount + App/router.ts mount', () => {
    const problems = mountProblems([
      {
        file: 'api/src/server.ts',
        source: `export const create = createServerFactory({
  preApiRouter: async (app) => {
    const contentHandlers = (await import('./handlers/index.js')).default
    app.use('/api', userAuthorization.verifyMiddleware())
    app.use('/api', contentHandlers)
  },
})`,
      },
      {
        file: 'api/src/App/router.ts',
        source: `export const router = Router()

router.use(userAuthorization.verifyMiddleware({ allowCookieSession: false }))`,
      },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('2 times')
    expect(problems[0]).toContain('api/src/server.ts:4')
  })

  it('flags a lone root mount that is not in App/router.ts', () => {
    const problems = mountProblems([
      {
        file: 'api/src/server.ts',
        source: `app.use('/api', userAuthorization.verifyMiddleware())`,
      },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('not api/src/App/router.ts')
  })

  it('flags a template whose router mounted nothing', () => {
    const problems = mountProblems([
      { file: 'api/src/App/router.ts', source: 'export const router = Router()' },
    ])
    expect(problems).toEqual(['mounts the session middleware nowhere at the /api root'])
  })

  it('flags a mount outside the /api prefix', () => {
    const problems = mountProblems([
      {
        file: 'api/src/App/router.ts',
        source: `router.use(userAuthorization.verifyMiddleware())
app.use('/uploads', userAuthorization.verifyMiddleware())`,
      },
    ])
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("at '/uploads'")
  })

  it('allows the pre-body-parser upload mount alongside the router mount', () => {
    const problems = mountProblems([
      {
        file: 'api/src/server.ts',
        source: `export const create = createServerFactory({
  preBodyParser: async (app) => {
    const { default: uploadsRouter } = await import('./handlers/uploads.js')
    app.use('/api/uploads', userAuthorization.verifyMiddleware(), uploadsRouter)
  },
})`,
      },
      {
        file: 'api/src/App/router.ts',
        source: `export const router = Router()

router.use(userAuthorization.verifyMiddleware())`,
      },
    ])
    expect(problems).toEqual([])
  })

  it('counts a wrapped mount once, and ignores the doc comment that names it', () => {
    const sites = mountSites(
      'api/src/App/router.ts',
      `// The app mounts it once: router.use(userAuthorization.verifyMiddleware())
export const router = Router()

router.use(
  userAuthorization.verifyMiddleware({ allowCookieSession: false }),
)`,
    )
    expect(sites).toHaveLength(1)
    expect(sites[0].line).toBe(4)
    expect(sites[0].path).toBe('')
  })
})
